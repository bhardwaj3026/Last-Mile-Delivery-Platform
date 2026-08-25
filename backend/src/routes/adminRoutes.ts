import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { Role, OrderType, AgentAvailability } from '../types/enums.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { NotificationService } from '../services/notificationService.js';
import { getIndianStateForPincode } from '../engine/rateEngine.js';
import { OrderService } from '../services/orderService.js';
import { z } from 'zod';

export function createAdminRouter(
  prisma: PrismaClient,
  notificationService?: NotificationService,
  orderService?: OrderService
): Router {
  const router = Router();

  // Protect all admin routes with ADMIN role
  router.use(requireAuth);
  router.use(requireRole(Role.ADMIN));

  // --- PINCODE LOOKUP & AUTO STATE RESOLUTION ---

  // GET /api/admin/pincode-lookup/:pincode
  router.get('/pincode-lookup/:pincode', async (req: Request, res: Response) => {
    try {
      const cleanPincode = String(req.params.pincode).trim();

      if (!/^\d{6}$/.test(cleanPincode)) {
        return res.status(404).json({ isValid: false, pincode: cleanPincode, message: 'Invalid 6-digit pincode' });
      }

      // 1. Check PincodeLookupCache table first
      const cached = await prisma.pincodeLookupCache.findUnique({ where: { pincode: cleanPincode } });
      if (cached) {
        return res.json({
          pincode: cleanPincode,
          state: cached.state,
          district: cached.district || undefined,
          isValid: true,
          cached: true,
        });
      }

      // 2. Fast check offline dictionary for instant match
      const dictionaryState = getIndianStateForPincode(cleanPincode);

      // 3. Cache miss: Call India Post API with 800ms timeout
      let state: string | null = null;
      let district: string | null = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);

        const apiRes = await fetch(`https://api.postalpincode.in/pincode/${cleanPincode}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (apiRes.ok) {
          const data: any = await apiRes.json();
          if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
            state = data[0].PostOffice[0].State;
            district = data[0].PostOffice[0].District;
          }
        }
      } catch (apiErr: any) {
        // Soft catch API latency/error
      }

      // 3. If API returned valid state, store in cache
      if (state) {
        try {
          await prisma.pincodeLookupCache.upsert({
            where: { pincode: cleanPincode },
            update: { state, district },
            create: { pincode: cleanPincode, state, district },
          });
        } catch (dbErr) {
          console.error('[PincodeLookup] Cache save error:', dbErr);
        }

        return res.json({
          pincode: cleanPincode,
          state,
          district: district || undefined,
          isValid: true,
          cached: false,
        });
      }

      // 4. Fallback to internal 2-digit prefix dictionary if API is slow/offline
      const fallbackState = getIndianStateForPincode(cleanPincode);
      if (fallbackState && fallbackState !== 'Other Region') {
        return res.json({
          pincode: cleanPincode,
          state: fallbackState,
          isValid: true,
          fallback: true,
        });
      }

      return res.status(404).json({
        isValid: false,
        pincode: cleanPincode,
        message: 'Could not verify this pincode',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // --- ZONES & PINCODES ---

  // POST /api/admin/zones
  router.post('/zones', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        name: z.string().min(2),
        pincodes: z.array(z.string()).default([]),
      });
      const body = schema.parse(req.body);

      const zone = await prisma.zone.create({
        data: {
          name: body.name,
          pincodeMaps: {
            create: body.pincodes.map(p => ({ pincode: p.trim() })),
          },
        },
        include: { pincodeMaps: true },
      });

      orderService?.clearEngineCache();
      return res.status(201).json(zone);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // GET /api/admin/zones
  router.get('/zones', async (req: Request, res: Response) => {
    try {
      const zones = await prisma.zone.findMany({
        orderBy: { name: 'asc' },
        include: { pincodeMaps: true },
      });
      return res.json(zones);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/admin/zones/:id
  router.patch('/zones/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        name: z.string().optional(),
        pincodes: z.array(z.string()).optional(),
      });
      const body = schema.parse(req.body);

      if (body.pincodes) {
        await prisma.pincodeZoneMap.deleteMany({ where: { zoneId: id } });
        await prisma.pincodeZoneMap.createMany({
          data: body.pincodes.map(p => ({ pincode: p.trim(), zoneId: id })),
        });
      }

      const updated = await prisma.zone.update({
        where: { id },
        data: {
          ...(body.name && { name: body.name }),
        },
        include: { pincodeMaps: true },
      });

      orderService?.clearEngineCache();
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // POST /api/admin/pincode-map
  router.post('/pincode-map', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        pincode: z.string().min(1),
        zoneId: z.string().uuid(),
      });
      const body = schema.parse(req.body);
      const cleanPincode = body.pincode.trim();

      const map = await prisma.pincodeZoneMap.upsert({
        where: { pincode: cleanPincode },
        update: { zoneId: body.zoneId },
        create: { pincode: cleanPincode, zoneId: body.zoneId },
      });

      orderService?.clearEngineCache();
      return res.status(200).json(map);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // --- RATE CARDS ---

  // POST /api/admin/rate-cards
  router.post('/rate-cards', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        fromZoneId: z.string().uuid(),
        toZoneId: z.string().uuid(),
        orderType: z.enum(['B2B', 'B2C']),
        baseRate: z.number().nonnegative(),
        perKgRate: z.number().nonnegative(),
      });
      const body = schema.parse(req.body);

      const isIntraZone = body.fromZoneId === body.toZoneId;

      const rateCard = await prisma.rateCard.upsert({
        where: {
          fromZoneId_toZoneId_orderType: {
            fromZoneId: body.fromZoneId,
            toZoneId: body.toZoneId,
            orderType: body.orderType as OrderType,
          },
        },
        update: {
          baseRate: body.baseRate,
          perKgRate: body.perKgRate,
          isIntraZone,
        },
        create: {
          fromZoneId: body.fromZoneId,
          toZoneId: body.toZoneId,
          orderType: body.orderType as OrderType,
          baseRate: body.baseRate,
          perKgRate: body.perKgRate,
          isIntraZone,
        },
        include: { fromZone: true, toZone: true },
      });

      orderService?.clearEngineCache();
      return res.status(201).json(rateCard);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // GET /api/admin/rate-cards
  router.get('/rate-cards', async (req: Request, res: Response) => {
    try {
      const rateCards = await prisma.rateCard.findMany({
        include: { fromZone: true, toZone: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(rateCards);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/admin/rate-cards/:id
  router.patch('/rate-cards/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        baseRate: z.number().nonnegative().optional(),
        perKgRate: z.number().nonnegative().optional(),
      });
      const body = schema.parse(req.body);

      const updated = await prisma.rateCard.update({
        where: { id },
        data: body,
        include: { fromZone: true, toZone: true },
      });

      orderService?.clearEngineCache();
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // --- COD SURCHARGE CONFIG ---

  // POST /api/admin/cod-config
  router.post('/cod-config', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        orderType: z.enum(['B2B', 'B2C']),
        flatFee: z.number().nonnegative(),
        percentOfBill: z.number().nonnegative(),
      });
      const body = schema.parse(req.body);

      const config = await prisma.codSurchargeConfig.upsert({
        where: { orderType: body.orderType as OrderType },
        update: {
          flatFee: body.flatFee,
          percentOfBill: body.percentOfBill,
        },
        create: {
          orderType: body.orderType as OrderType,
          flatFee: body.flatFee,
          percentOfBill: body.percentOfBill,
        },
      });

      orderService?.clearEngineCache();
      return res.json(config);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // GET /api/admin/cod-config
  router.get('/cod-config', async (req: Request, res: Response) => {
    try {
      const configs = await prisma.codSurchargeConfig.findMany();
      return res.json(configs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // --- AGENTS ---

  // POST /api/admin/agents
  router.post('/agents', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        zoneId: z.string().uuid(),
        currentLat: z.number().optional(),
        currentLng: z.number().optional(),
      });
      const body = schema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
        include: { agentProfile: true },
      });

      let user: any;

      if (existingUser) {
        // Upgrade / attach Agent profile to existing Customer user
        const passwordHash = await bcrypt.hash(body.password, 12);

        if (existingUser.agentProfile) {
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: body.name || existingUser.name,
              passwordHash,
              phone: body.phone || existingUser.phone,
              role: Role.AGENT,
              agentProfile: {
                update: {
                  zoneId: body.zoneId,
                  availability: AgentAvailability.AVAILABLE,
                  ...(body.currentLat !== undefined && { currentLat: body.currentLat }),
                  ...(body.currentLng !== undefined && { currentLng: body.currentLng }),
                },
              },
            },
            include: { agentProfile: { include: { zone: true } } },
          });
        } else {
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: body.name || existingUser.name,
              passwordHash,
              phone: body.phone || existingUser.phone,
              role: Role.AGENT,
              agentProfile: {
                create: {
                  zoneId: body.zoneId,
                  availability: AgentAvailability.AVAILABLE,
                  currentLat: body.currentLat ?? null,
                  currentLng: body.currentLng ?? null,
                },
              },
            },
            include: { agentProfile: { include: { zone: true } } },
          });
        }
      } else {
        // Create new Agent user
        const passwordHash = await bcrypt.hash(body.password, 12);
        user = await prisma.user.create({
          data: {
            name: body.name,
            email: body.email,
            passwordHash,
            role: Role.AGENT,
            phone: body.phone,
            agentProfile: {
              create: {
                zoneId: body.zoneId,
                availability: AgentAvailability.AVAILABLE,
                currentLat: body.currentLat ?? null,
                currentLng: body.currentLng ?? null,
              },
            },
          },
          include: {
            agentProfile: { include: { zone: true } },
          },
        });
      }

      // Dispatch welcome email with agent credentials
      if (notificationService) {
        const zoneName = user.agentProfile?.zone?.name || 'Assigned Base Zone';
        await notificationService.send({
          orderId: 'AGENT_CREATION',
          recipientEmail: user.email,
          recipientPhone: user.phone || undefined,
          event: 'STATUS_CHANGE',
          status: 'AGENT_ACCOUNT_CREATED',
          details: `Welcome ${user.name}! Your Field Agent Account Credentials:\n\nEmail: ${user.email}\nPassword: ${body.password}\nAssigned Zone: ${zoneName}\nLogin Portal: http://localhost:5173/login`,
        });
      }

      return res.status(201).json(user);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // GET /api/admin/agents
  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const { zoneId, availability } = req.query;

      const where: any = {};
      if (zoneId) where.zoneId = String(zoneId);
      if (availability) where.availability = availability as AgentAvailability;

      const agents = await prisma.agentProfile.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          zone: true,
          orders: {
            where: { status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
            select: { id: true, status: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return res.json(agents);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/admin/agents/:id (Modify agent details)
  router.patch('/agents/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        zoneId: z.string().uuid().optional(),
        availability: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).optional(),
        password: z.string().min(6).optional(),
      });
      const body = schema.parse(req.body);

      const agent = await prisma.agentProfile.findUnique({ where: { id }, include: { user: true } });
      if (!agent) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // Update User fields if name/phone/password provided
      if (body.name || body.phone !== undefined || body.password) {
        const userUpdateData: any = {};
        if (body.name) userUpdateData.name = body.name;
        if (body.phone !== undefined) userUpdateData.phone = body.phone;
        if (body.password) userUpdateData.passwordHash = await bcrypt.hash(body.password, 12);

        await prisma.user.update({
          where: { id: agent.userId },
          data: userUpdateData,
        });
      }

      // Update AgentProfile fields
      const updated = await prisma.agentProfile.update({
        where: { id },
        data: {
          ...(body.availability && { availability: body.availability as AgentAvailability }),
          ...(body.zoneId && { zoneId: body.zoneId }),
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          zone: true,
        },
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/admin/agents/:id (Remove agent)
  router.delete('/agents/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const agent = await prisma.agentProfile.findUnique({ where: { id } });
      if (!agent) {
        return res.status(404).json({ error: 'Agent profile not found' });
      }

      // 1. Unassign agent from active/past orders
      await prisma.order.updateMany({
        where: { agentId: id },
        data: { agentId: null },
      });

      // 2. Delete AgentProfile
      await prisma.agentProfile.delete({
        where: { id },
      });

      // 3. Revert user role to CUSTOMER or delete user if created solely as agent
      const ordersPlaced = await prisma.order.count({ where: { customerId: agent.userId } });
      if (ordersPlaced > 0) {
        await prisma.user.update({
          where: { id: agent.userId },
          data: { role: Role.CUSTOMER },
        });
      } else {
        await prisma.user.update({
          where: { id: agent.userId },
          data: { role: Role.CUSTOMER },
        });
      }

      return res.json({ message: 'Agent removed successfully', id });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // --- NOTIFICATION AUDIT LOGS ---

  // GET /api/admin/notifications
  router.get('/notifications', async (req: Request, res: Response) => {
    try {
      const { orderId } = req.query;
      const where: any = {};
      if (orderId) where.orderId = String(orderId);

      const logs = await prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
