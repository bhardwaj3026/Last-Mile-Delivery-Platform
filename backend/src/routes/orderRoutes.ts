import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OrderStatus, Role } from '../types/enums.js';
import { OrderService } from '../services/orderService.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { z } from 'zod';

export function createOrderRouter(prisma: PrismaClient, orderService: OrderService): Router {
  const router = Router();

  const quoteSchema = z.object({
    pickupPincode: z.string().min(1, 'Pickup pincode required'),
    dropPincode: z.string().min(1, 'Drop pincode required'),
    lengthCm: z.number().positive('Length must be positive'),
    breadthCm: z.number().positive('Breadth must be positive'),
    heightCm: z.number().positive('Height must be positive'),
    actualWeightKg: z.number().positive('Weight must be positive'),
    orderType: z.enum(['B2B', 'B2C']),
    paymentType: z.enum(['PREPAID', 'COD']),
  });

  const createOrderSchema = quoteSchema.extend({
    pickupAddress: z.string().min(3, 'Pickup address required'),
    dropAddress: z.string().min(3, 'Drop address required'),
    customerId: z.string().uuid().optional(), // Used if admin creates on behalf of customer
    pickupLat: z.number().optional(),
    pickupLng: z.number().optional(),
  });

  // POST /api/orders/quote (Public or authenticated live quote calculator)
  router.post('/quote', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const input = quoteSchema.parse(req.body);
      const breakdown = await orderService.getQuote(input);
      return res.json(breakdown);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return res.status(statusCode).json({ error: err.message });
    }
  });

  // Protect remaining order endpoints with auth
  router.use(requireAuth);

  // POST /api/orders (Create order)
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = createOrderSchema.parse(req.body);
      const user = req.user!;

      let targetCustomerId = user.id;
      let createdByAdmin = false;

      if (user.role === Role.ADMIN) {
        if (body.customerId) {
          targetCustomerId = body.customerId;
        }
        createdByAdmin = true;
      } else if (user.role === Role.AGENT) {
        return res.status(403).json({ error: 'Agents cannot create customer orders' });
      }

      const order = await orderService.createOrder(body, targetCustomerId, createdByAdmin, user.email);
      return res.status(201).json(order);
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return res.status(statusCode).json({ error: err.message });
    }
  });

  // GET /api/orders (Role-scoped list)
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { status, zoneId, agentId } = req.query;

      const orders = await orderService.getOrders({
        role: user.role,
        userId: user.id,
        status: status as OrderStatus,
        zoneId: zoneId as string,
        agentId: agentId as string,
      });

      return res.json(orders);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/orders/:id
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const user = req.user!;
      // Access check
      if (user.role === Role.CUSTOMER && order.customerId !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (user.role === Role.AGENT && order.agent?.userId !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return res.json(order);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/orders/:id/tracking (Full immutable status history)
  router.get('/:id/tracking', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      return res.json({
        orderId: order.id,
        status: order.status,
        pickupZone: order.pickupZoneId,
        dropZone: order.dropZoneId,
        rescheduleDate: order.rescheduleDate,
        statusHistory: order.statusHistory,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/orders/:id/assign (Admin manual assign)
  router.patch('/:id/assign', requireRole(Role.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({ agentId: z.string().uuid() });
      const { agentId } = schema.parse(req.body);

      const order = await orderService.manualAssign(id, agentId, req.user!.id);
      return res.json(order);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // POST /api/orders/:id/auto-assign (Admin trigger auto assign)
  router.post('/:id/auto-assign', requireRole(Role.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const order = await orderService.attemptAutoAssignment(id);
      if (!order) {
        return res.status(400).json({ error: 'No available agent in pickup zone for auto-assignment' });
      }
      return res.json(order);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // PATCH /api/orders/:id/status (Agent/Admin update status)
  router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        status: z.enum([
          'CREATED',
          'ASSIGNED',
          'PICKED_UP',
          'IN_TRANSIT',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'FAILED',
          'RESCHEDULED',
        ]),
        note: z.string().optional(),
      });
      const { status, note } = schema.parse(req.body);
      const user = req.user!;

      if (user.role === Role.CUSTOMER) {
        return res.status(403).json({ error: 'Customers cannot manually update status' });
      }

      const updated = await orderService.updateOrderStatus(
        id,
        status as OrderStatus,
        user.id,
        user.role,
        note
      );

      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // POST /api/orders/:id/reschedule (Customer reschedule after FAILED)
  router.post('/:id/reschedule', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        rescheduleDate: z.string().transform(str => new Date(str)),
      });
      const { rescheduleDate } = schema.parse(req.body);
      const user = req.user!;

      const updated = await orderService.rescheduleOrder(id, rescheduleDate, user.id);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  return router;
}
