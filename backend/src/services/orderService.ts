import { PrismaClient } from '@prisma/client';
import { OrderStatus, Role, OrderType, PaymentType, AgentAvailability } from '../types/enums.js';
import { calculateCharge, QuoteInput, ChargeBreakdown, RateEngineError } from '../engine/rateEngine.js';
import { findNearestAvailableAgent } from '../engine/assignmentEngine.js';
import { NotificationService } from './notificationService.js';

export interface CreateOrderInput extends QuoteInput {
  pickupAddress: string;
  dropAddress: string;
  customerName?: string;
  customerEmail?: string;
  pickupLat?: number;
  pickupLng?: number;
}

export class OrderService {
  private prisma: PrismaClient;
  private notificationService: NotificationService;

  constructor(prisma: PrismaClient, notificationService: NotificationService) {
    this.prisma = prisma;
    this.notificationService = notificationService;
  }

  private engineCache: { zones: any[]; rateCards: any[]; codConfigs: any[]; timestamp: number } | null = null;
  private CACHE_TTL_MS = 60000; // 1 minute TTL

  public clearEngineCache() {
    this.engineCache = null;
  }

  private async fetchEngineData() {
    const now = Date.now();
    if (this.engineCache && (now - this.engineCache.timestamp) < this.CACHE_TTL_MS) {
      return this.engineCache;
    }

    const zones = await this.prisma.zone.findMany({ select: { id: true, name: true, pincodeMaps: true } });
    const rateCardsRaw = await this.prisma.rateCard.findMany();
    const codConfigsRaw = await this.prisma.codSurchargeConfig.findMany();

    const rateCards = rateCardsRaw.map(rc => ({
      id: rc.id,
      fromZoneId: rc.fromZoneId,
      toZoneId: rc.toZoneId,
      orderType: rc.orderType as 'B2B' | 'B2C',
      baseRate: Number(rc.baseRate),
      perKgRate: Number(rc.perKgRate),
    }));

    const codConfigs = codConfigsRaw.map(c => ({
      orderType: c.orderType as 'B2B' | 'B2C',
      flatFee: Number(c.flatFee),
      percentOfBill: Number(c.percentOfBill),
    }));

    this.engineCache = { zones, rateCards, codConfigs, timestamp: now };
    return this.engineCache;
  }

  public async getQuote(input: QuoteInput): Promise<ChargeBreakdown> {
    const { zones, rateCards, codConfigs } = await this.fetchEngineData();
    return calculateCharge(input, zones, rateCards, codConfigs);
  }

  public async createOrder(
    input: CreateOrderInput,
    customerId: string,
    createdByAdmin = false,
    customerEmail?: string
  ) {
    const { zones, rateCards, codConfigs } = await this.fetchEngineData();
    const breakdown = calculateCharge(input, zones, rateCards, codConfigs);

    let customer = await this.prisma.user.findUnique({ where: { id: customerId } });
    if (!customer && customerEmail) {
      customer = await this.prisma.user.findUnique({ where: { email: customerEmail } });
    }
    if (!customer) throw new Error('Customer user not found. Please log in again.');

    const resolvedCustomerId = customer.id;

    // 1. Create order with snapshotted charges
    const order = await this.prisma.order.create({
      data: {
        customerId: resolvedCustomerId,
        orderType: input.orderType as OrderType,
        paymentType: input.paymentType as PaymentType,
        pickupAddress: input.pickupAddress,
        pickupPincode: input.pickupPincode,
        pickupZoneId: breakdown.pickupZoneId,
        dropAddress: input.dropAddress,
        dropPincode: input.dropPincode,
        dropZoneId: breakdown.dropZoneId,
        lengthCm: input.lengthCm,
        breadthCm: input.breadthCm,
        heightCm: input.heightCm,
        actualWeightKg: input.actualWeightKg,
        volumetricWeightKg: breakdown.volumetricWeightKg,
        billableWeightKg: breakdown.billableWeightKg,
        rateCardId: breakdown.rateCardId,
        baseCharge: breakdown.baseCharge,
        weightCharge: breakdown.weightCharge,
        codSurcharge: breakdown.codSurcharge,
        totalCharge: breakdown.totalCharge,
        status: OrderStatus.CREATED,
        createdByAdmin,
        statusHistory: {
          create: {
            status: OrderStatus.CREATED,
            actorId: resolvedCustomerId,
            actorRole: createdByAdmin ? Role.ADMIN : Role.CUSTOMER,
            note: 'Order created',
          },
        },
      },
      include: {
        customer: true,
        agent: { include: { user: true } },
        statusHistory: true,
      },
    });

    // Notify creation
    await this.notificationService.send({
      orderId: order.id,
      recipientEmail: customer.email,
      event: 'ORDER_CREATED',
      status: 'CREATED',
      details: `Total Charge: ₹${breakdown.totalCharge.toFixed(2)} (${input.paymentType})`,
    });

    // 2. Try Auto-assignment
    await this.attemptAutoAssignment(order.id, input.pickupLat, input.pickupLng);

    // Return latest order record
    return this.getOrderById(order.id);
  }

  public async attemptAutoAssignment(orderId: string, pickupLat?: number, pickupLng?: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || (order.status !== 'CREATED' && order.status !== 'RESCHEDULED')) {
      return null;
    }

    const agentsRaw = await this.prisma.agentProfile.findMany({
      where: { zoneId: order.pickupZoneId, availability: AgentAvailability.AVAILABLE },
    });

    const candidates = agentsRaw.map(a => ({
      id: a.id,
      userId: a.userId,
      zoneId: a.zoneId,
      availability: a.availability as 'AVAILABLE' | 'BUSY' | 'OFFLINE',
      currentLat: a.currentLat,
      currentLng: a.currentLng,
      updatedAt: a.updatedAt,
    }));

    const selectedAgent = findNearestAvailableAgent(order.pickupZoneId, candidates, pickupLat, pickupLng);

    if (selectedAgent) {
      // Assign order to agent
      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: orderId },
          data: {
            agentId: selectedAgent.id,
            status: OrderStatus.ASSIGNED,
          },
        }),
        this.prisma.agentProfile.update({
          where: { id: selectedAgent.id },
          data: { availability: AgentAvailability.BUSY },
        }),
        this.prisma.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatus.ASSIGNED,
            actorId: 'system-auto-assign',
            actorRole: Role.ADMIN,
            note: `Auto-assigned to nearest available agent in pickup zone`,
          },
        }),
      ]);

      const updatedOrder = await this.getOrderById(orderId);
      if (updatedOrder?.customer?.email) {
        await this.notificationService.send({
          orderId,
          recipientEmail: updatedOrder.customer.email,
          event: 'ORDER_ASSIGNED',
          status: 'ASSIGNED',
          details: `Assigned agent: ${updatedOrder.agent?.user?.name || 'Agent'}`,
        });
      }

      return updatedOrder;
    }

    return null;
  }

  public async manualAssign(orderId: string, agentId: string, adminUserId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const agent = await this.prisma.agentProfile.findUnique({ where: { id: agentId }, include: { user: true } });
    if (!agent) throw new Error('Agent profile not found');

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          agentId,
          status: OrderStatus.ASSIGNED,
        },
      }),
      this.prisma.agentProfile.update({
        where: { id: agentId },
        data: { availability: AgentAvailability.BUSY },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.ASSIGNED,
          actorId: adminUserId,
          actorRole: Role.ADMIN,
          note: `Manually assigned to agent ${agent.user.name}`,
        },
      }),
    ]);

    const updatedOrder = await this.getOrderById(orderId);
    if (updatedOrder?.customer?.email) {
      await this.notificationService.send({
        orderId,
        recipientEmail: updatedOrder.customer.email,
        event: 'ORDER_ASSIGNED',
        status: 'ASSIGNED',
        details: `Assigned agent: ${agent.user.name}`,
      });
    }

    return updatedOrder;
  }

  public async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    actorId: string,
    actorRole: Role,
    note?: string
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, agent: true },
    });
    if (!order) throw new Error('Order not found');

    // Rule: Agent can only update status if assigned to this order (unless ADMIN override)
    if (actorRole === Role.AGENT) {
      if (!order.agentId || order.agent?.userId !== actorId) {
        throw new Error('Forbidden: Agent is not assigned to this order');
      }
    }

    // Update order and append immutable history
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          actorId,
          actorRole,
          note: note || `Status updated to ${newStatus}`,
        },
      }),
    ]);

    // Handle agent availability flip when order concludes
    if (order.agentId && (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.FAILED)) {
      // Check if agent has other active assigned orders
      const activeOrdersCount = await this.prisma.order.count({
        where: {
          agentId: order.agentId,
          id: { not: orderId },
          status: { in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY] },
        },
      });

      if (activeOrdersCount === 0) {
        await this.prisma.agentProfile.update({
          where: { id: order.agentId },
          data: { availability: AgentAvailability.AVAILABLE },
        });
      }
    }

    const updatedOrder = await this.getOrderById(orderId);

    // Trigger email notification
    if (updatedOrder?.customer?.email) {
      let event: any = 'STATUS_CHANGE';
      if (newStatus === OrderStatus.DELIVERED) event = 'ORDER_DELIVERED';
      if (newStatus === OrderStatus.FAILED) event = 'ORDER_FAILED';

      await this.notificationService.send({
        orderId,
        recipientEmail: updatedOrder.customer.email,
        event,
        status: newStatus,
        details: note || `Package status updated to ${newStatus}`,
      });
    }

    return updatedOrder;
  }

  public async rescheduleOrder(orderId: string, rescheduleDate: Date, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order) throw new Error('Order not found');

    if (order.customerId !== customerId) {
      throw new Error('Forbidden: Only the order owner can reschedule');
    }

    if (order.status !== OrderStatus.FAILED) {
      throw new Error('Order can only be rescheduled if in FAILED status');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.RESCHEDULED,
          rescheduleDate,
        },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.RESCHEDULED,
          actorId: customerId,
          actorRole: Role.CUSTOMER,
          note: `Rescheduled by customer for ${rescheduleDate.toISOString().split('T')[0]}`,
        },
      }),
    ]);

    // Re-attempt auto-assignment
    await this.attemptAutoAssignment(orderId);

    const updatedOrder = await this.getOrderById(orderId);
    if (updatedOrder?.customer?.email) {
      await this.notificationService.send({
        orderId,
        recipientEmail: updatedOrder.customer.email,
        event: 'ORDER_RESCHEDULED',
        status: 'RESCHEDULED',
        details: `New scheduled delivery date: ${rescheduleDate.toISOString().split('T')[0]}`,
      });
    }

    return updatedOrder;
  }

  public async getOrderById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        agent: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            zone: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  public async getOrders(filters: {
    role: Role;
    userId: string;
    status?: OrderStatus;
    zoneId?: string;
    agentId?: string;
  }) {
    const where: any = {};

    if (filters.role === Role.CUSTOMER) {
      where.customerId = filters.userId;
    } else if (filters.role === Role.AGENT) {
      // Find agentProfileId
      const agentProfile = await this.prisma.agentProfile.findUnique({ where: { userId: filters.userId } });
      if (agentProfile) {
        where.agentId = agentProfile.id;
      } else {
        return [];
      }
    } else if (filters.role === Role.ADMIN) {
      if (filters.status) where.status = filters.status;
      if (filters.zoneId) {
        where.OR = [{ pickupZoneId: filters.zoneId }, { dropZoneId: filters.zoneId }];
      }
      if (filters.agentId) where.agentId = filters.agentId;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        agent: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            zone: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
