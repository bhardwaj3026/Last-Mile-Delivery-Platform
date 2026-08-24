# System Design Document — Last-Mile Delivery Tracker

## 1. Rate Calculation Engine Architecture
The rate calculation engine is implemented as a pure, side-effect-free, unit-testable module (`src/engine/rateEngine.ts`) decoupled from any HTTP or database frameworks. This guarantees deterministic behavior, easy regression testing, and zero runtime dependencies.

The engine evaluates billing through a strict 9-step pipeline:
1. **Pincode to Zone Resolution**: Lookup origin (`pickupPincode`) and destination (`dropPincode`) against configured zone definitions. Unmapped pincodes return a structured `422 Unprocessable Entity` error.
2. **Volumetric Weight Calculation**: Applied using the standard industry cubic formula:
   $$\text{Volumetric Weight (kg)} = \frac{L \times B \times H \text{ (cm)}}{5000}$$
3. **Billable Weight Determination**: Evaluates $\max(\text{Actual Weight}, \text{Volumetric Weight})$.
4. **Directed Rate Card Lookup**: Queries for a matching `RateCard` configured for `(fromZoneId, toZoneId, orderType)`. Intra-zone shipments match rows where `fromZoneId == toZoneId`. Missing configurations trigger a `422` error.
5. **Base Charge**: Flat base rate retrieved from the matched rate card.
6. **Weight Charge**: Calculated as $\text{Billable Weight} \times \text{perKgRate}$.
7. **Subtotal**: $\text{Base Charge} + \text{Weight Charge}$.
8. **COD Surcharge**: Evaluated only if `paymentType === 'COD'`. Derived from `CodSurchargeConfig` via:
   $$\text{COD Surcharge} = \text{flatFee} + \left( \frac{\text{percentOfBill}}{100} \times \text{Subtotal} \right)$$
9. **Final Total & Breakdown**: Sums subtotal and COD surcharge, rounding all monetary components to two decimal places before snapshotting the breakdown object onto the order record.

---

## 2. Zone Detection & Pincode Mapping Approach
To optimize zone resolution performance, the system uses a hybrid lookup pattern:
- **Relational Mapping Table (`PincodeZoneMap`)**: Maps individual pincodes directly to `zoneId` with a primary key index on `pincode`. This guarantees $O(1)$ lookup complexity at scale regardless of zone size.
- **Zone Array Sync (`Zone.pincodes`)**: Maintains a denormalized string array on the `Zone` model for administrative grouping and simplified frontend payload serialization.

When a quote or order request arrives, the system resolves pincodes against `PincodeZoneMap`. If a pincode is not present, it gracefully falls back to checking `Zone.pincodes`. If unmapped, execution halts immediately with a clear error payload.

---

## 3. Auto-Assignment Engine
Agent dispatch operates through a zone-scoped candidate selection algorithm (`findNearestAvailableAgent`):

```
Pickup Zone ID → Filter Agents (availability === 'AVAILABLE' AND zoneId === pickupZoneId)
                     │
         ┌───────────┴───────────┐
  Locations Present?       No Locations?
         │                       │
Haversine Distance Sorting   FIFO Idle Time
  Rank by Min Distance     Rank by Oldest updatedAt
         │                       │
         └───────────┬───────────┘
                     ▼
         Assign Order & Mark BUSY
```

1. **Candidate Pool Filtering**: Agents are scoped strictly to the pickup zone. Only agents with `availability === 'AVAILABLE'` in `order.pickupZoneId` are eligible.
2. **Spatial Ranking (Haversine Formula)**: If pickup coordinates and agent `currentLat`/`currentLng` are available, candidates are sorted by spherical distance:
   $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
3. **Fallback FIFO Scheduling**: If spatial coordinates are absent, candidate ranking falls back to oldest `updatedAt` timestamp (longest idle time).
4. **State Mutations**: Upon assignment, `Order.agentId` is populated, `Order.status` advances to `ASSIGNED`, agent `availability` switches to `BUSY`, and an immutable `OrderStatusHistory` entry is logged.

---

## 4. Failed Delivery Lifecycle & Reschedule State Machine
Order status transitions follow an immutable, append-only history pattern via `OrderStatusHistory`. Historical transition records are never updated or deleted.

```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                                                 ↘ FAILED → RESCHEDULED → (ASSIGNED)
```

- **Failure Trigger**: When an agent or admin marks an order as `FAILED`, the assigned agent's availability is freed (`AVAILABLE`), and an automated email/SMS alert with a unique reschedule link is dispatched to the customer via `NotificationService`.
- **Customer Reschedule Flow**: The customer selects a new delivery date (`POST /api/orders/:id/reschedule`). The system validates that the order is currently in `FAILED` status, sets `rescheduleDate`, updates status to `RESCHEDULED`, and logs the action under `Role.CUSTOMER`.
- **Re-Dispatch**: Transitioning to `RESCHEDULED` automatically re-triggers the `findNearestAvailableAgent` engine, placing the package back into the active dispatch pipeline without price re-calculation.
