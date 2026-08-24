# Last-Mile Delivery Tracker & Dispatch Platform

A comprehensive delivery management platform built with **Node.js, Express, TypeScript, Prisma, PostgreSQL, React (Vite), and Tailwind CSS**. Features automated pricing quote engine, immutable status history auditing, zone-scoped nearest agent dispatch, failed delivery reschedule workflow, and email/SMS notification tracking.

---

## 1. Quick Start Guide

### Prerequisites
- Node.js v18+
- npm v9+
- PostgreSQL (or local instance)

### Installation & Setup

1. **Clone & Install Dependencies**:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the `backend/` directory (see `.env.example`):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lastmile_db?schema=public"
   PORT=4000
   JWT_ACCESS_SECRET="super_secret_access_key_lastmile_2026"
   JWT_REFRESH_SECRET="super_secret_refresh_key_lastmile_2026"
   SMTP_HOST="smtp.ethereal.email"
   SMTP_PORT=587
   SMTP_USER="mock_user@ethereal.email"
   SMTP_PASS="mock_pass_12345"
   SMTP_FROM="\"LastMile Logistics\" <no-reply@lastmile.com>"
   FRONTEND_URL="http://localhost:5173"
   ```

3. **Database Migration & Seeding**:
   ```bash
   cd backend
   # Push schema to PostgreSQL database
   npm run db:push

   # Seed database with initial Admin, Zones, Rate Cards, COD Config, Agents, and Sample Orders
   npm run seed
   ```

4. **Run Unit Tests**:
   ```bash
   cd backend
   npm test
   ```

5. **Start Development Servers**:
   ```bash
   # Terminal 1: Backend Server (Port 4000)
   cd backend
   npm run dev

   # Terminal 2: Frontend App (Port 5173)
   cd frontend
   npm run dev
   ```

---

## 2. Pre-seeded Admin Credentials

The database has been reset. Only the **Admin** account is pre-created:

| Role | Username / Email | Password | Access Rights |
|---|---|---|---|
| **Admin** | `Admin` (or `admin@delivery.com`) | `Admin@123` | Full Admin Control Center |

- **Customer accounts**: Created fresh via self-registration on `/register`.
- **Agent accounts**: Created directly by Admin in the Admin Control Center (`/admin` $\rightarrow$ Agents Roster $\rightarrow$ Register Delivery Agent).

---

## 3. Database Schema Overview

```prisma
enum Role { CUSTOMER AGENT ADMIN }
enum OrderType { B2B B2C }
enum PaymentType { PREPAID COD }
enum OrderStatus { CREATED ASSIGNED PICKED_UP IN_TRANSIT OUT_FOR_DELIVERY DELIVERED FAILED RESCHEDULED }
enum AgentAvailability { AVAILABLE BUSY OFFLINE }

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role
  phone        String?
  createdAt    DateTime @default(now())
}

model Zone {
  id        String   @id @default(uuid())
  name      String   @unique
  pincodes  String[]
}

model PincodeZoneMap {
  pincode String @id
  zoneId  String
}

model RateCard {
  id          String    @id @default(uuid())
  fromZoneId  String
  toZoneId    String
  orderType   OrderType
  baseRate    Decimal
  perKgRate   Decimal
  isIntraZone Boolean
}

model CodSurchargeConfig {
  id            String    @id @default(uuid())
  orderType     OrderType @unique
  flatFee       Decimal
  percentOfBill Decimal
}

model AgentProfile {
  id           String            @id @default(uuid())
  userId       String            @unique
  zoneId       String
  availability AgentAvailability @default(AVAILABLE)
  currentLat   Float?
  currentLng   Float?
}

model Order {
  id                 String      @id @default(uuid())
  customerId         String
  orderType          OrderType
  paymentType        PaymentType
  pickupAddress      String
  pickupPincode      String
  pickupZoneId       String
  dropAddress        String
  dropPincode        String
  dropZoneId         String
  lengthCm           Float
  breadthCm          Float
  heightCm           Float
  actualWeightKg     Float
  volumetricWeightKg Float
  billableWeightKg   Float
  rateCardId         String?
  baseCharge         Decimal
  weightCharge       Decimal
  codSurcharge       Decimal     @default(0)
  totalCharge        Decimal
  status             OrderStatus @default(CREATED)
  agentId            String?
  rescheduleDate     DateTime?
}

model OrderStatusHistory {
  id        String      @id @default(uuid())
  orderId   String
  status    OrderStatus
  actorId   String
  actorRole Role
  note      String?
  createdAt DateTime    @default(now())
}

model NotificationLog {
  id        String   @id @default(uuid())
  orderId   String
  channel   String
  toAddress String
  subject   String?
  status    String
  createdAt DateTime @default(now())
}
```

---

## 4. API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Customer self-registration |
| `POST` | `/login` | Public | Returns access token + httpOnly refresh token cookie |
| `POST` | `/forgot-password` | Public | Request password reset ticket & email link |
| `POST` | `/reset-password` | Public | Verify reset token & update password |
| `POST` | `/refresh` | Cookie | Refreshes short-lived JWT access token |
| `POST` | `/logout` | Public | Clears refresh token cookie |
| `GET` | `/me` | User | Get current logged-in profile |

### Orders & Quotes (`/api/orders`)
| Method | Path | Role Required | Description |
|---|---|---|---|
| `POST` | `/quote` | Public | Calculate live charge breakdown without creating order |
| `POST` | `/` | Customer / Admin | Create order and snapshot pricing breakdown |
| `GET` | `/` | Role-Scoped | Customer sees own, Agent sees assigned, Admin sees all |
| `GET` | `/:id` | Owner / Admin / Agent | Get order detail with status history |
| `GET` | `/:id/tracking` | Public / User | Full immutable status history timeline |
| `PATCH` | `/:id/assign` | Admin | Manual agent assignment |
| `POST` | `/:id/auto-assign` | Admin | Trigger nearest agent auto-assignment |
| `PATCH` | `/:id/status` | Agent / Admin | Advance order status with optional note |
| `POST` | `/:id/reschedule` | Customer | Reschedule delivery date after `FAILED` status |

### Admin Management (`/api/admin`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/zones` | Create new zone with initial pincodes |
| `GET` | `/zones` | List all zones and pincode mappings |
| `PATCH` | `/zones/:id` | Update zone name and pincodes |
| `POST` | `/pincode-map` | Map single pincode to zone |
| `POST` | `/rate-cards` | Create or update rate card |
| `GET` | `/rate-cards` | List configured rate cards |
| `PATCH` | `/rate-cards/:id` | Update rate card rates |
| `POST` | `/cod-config` | Update COD surcharge config (flat fee + %) |
| `GET` | `/cod-config` | List COD configs |
| `POST` | `/agents` | Create agent user and agent profile |
| `GET` | `/agents` | Filterable list of agents with zone & availability |
| `PATCH` | `/agents/:id/availability` | Update agent availability / GPS location |
| `GET` | `/notifications` | View system email/SMS audit log |

---

## 5. Rate Calculation Engine Walkthrough

The rate engine calculates charges in pure computational steps:

1. **Zone Resolution**: Maps `pickupPincode` -> `pickupZoneId` and `dropPincode` -> `dropZoneId`.
2. **Volumetric Weight**: Evaluates $(L \times B \times H) / 5000$.
3. **Billable Weight**: Selects $\max(\text{actualWeightKg}, \text{volumetricWeightKg})$.
4. **Rate Card Selection**: Queries matching directed pair rate card for `(fromZoneId, toZoneId, orderType)`.
5. **Base Charge**: Extracted from `rateCard.baseRate`.
6. **Weight Charge**: $\text{billableWeightKg} \times \text{rateCard.perKgRate}$.
7. **Subtotal**: $\text{Base Charge} + \text{Weight Charge}$.
8. **COD Surcharge**: If `paymentType === 'COD'`, calculates $\text{flatFee} + (\text{percentOfBill} / 100) \times \text{Subtotal}$.
9. **Total**: $\text{Subtotal} + \text{COD Surcharge}$.
