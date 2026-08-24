import { describe, it, expect } from 'vitest';
import {
  calculateCharge,
  calculateVolumetricWeight,
  RateEngineError,
  ZoneData,
  RateCardData,
  CodConfigData,
  QuoteInput,
} from './rateEngine.js';

describe('Rate Calculation Engine', () => {
  const zones: ZoneData[] = [
    { id: 'zone-1', name: 'Downtown', pincodes: ['110001', '110002'] },
    { id: 'zone-2', name: 'Metro East', pincodes: ['110091', '110092'] },
  ];

  const rateCards: RateCardData[] = [
    // Intra-zone Downtown B2C
    {
      id: 'rc-1',
      fromZoneId: 'zone-1',
      toZoneId: 'zone-1',
      orderType: 'B2C',
      baseRate: 50,
      perKgRate: 10,
    },
    // Inter-zone Downtown -> Metro East B2C
    {
      id: 'rc-2',
      fromZoneId: 'zone-1',
      toZoneId: 'zone-2',
      orderType: 'B2C',
      baseRate: 100,
      perKgRate: 20,
    },
    // Inter-zone Downtown -> Metro East B2B
    {
      id: 'rc-3',
      fromZoneId: 'zone-1',
      toZoneId: 'zone-2',
      orderType: 'B2B',
      baseRate: 150,
      perKgRate: 15,
    },
  ];

  const codConfigs: CodConfigData[] = [
    { orderType: 'B2C', flatFee: 25, percentOfBill: 2 }, // 25 + 2%
    { orderType: 'B2B', flatFee: 50, percentOfBill: 1.5 }, // 50 + 1.5%
  ];

  it('calculates volumetric weight correctly: (L x B x H) / 5000', () => {
    // 50 x 40 x 30 = 60,000 / 5000 = 12 kg
    const volWeight = calculateVolumetricWeight(50, 40, 30);
    expect(volWeight).toBe(12);
  });

  it('handles intra-zone shipment where actual weight > volumetric weight', () => {
    const input: QuoteInput = {
      pickupPincode: '110001',
      dropPincode: '110002',
      lengthCm: 10,
      breadthCm: 10,
      heightCm: 10, // Volumetric = 0.2 kg
      actualWeightKg: 5, // Billable = 5 kg
      orderType: 'B2C',
      paymentType: 'PREPAID',
    };

    const breakdown = calculateCharge(input, zones, rateCards, codConfigs);

    expect(breakdown.pickupZoneName).toBe('Downtown');
    expect(breakdown.dropZoneName).toBe('Downtown');
    expect(breakdown.isIntraZone).toBe(true);
    expect(breakdown.volumetricWeightKg).toBe(0.2);
    expect(breakdown.billableWeightKg).toBe(5);
    expect(breakdown.baseCharge).toBe(50);
    expect(breakdown.weightCharge).toBe(50); // 5 kg * 10/kg
    expect(breakdown.subtotal).toBe(100);
    expect(breakdown.codSurcharge).toBe(0);
    expect(breakdown.totalCharge).toBe(100);
  });

  it('handles inter-zone shipment where volumetric weight > actual weight', () => {
    const input: QuoteInput = {
      pickupPincode: '110001',
      dropPincode: '110091',
      lengthCm: 50,
      breadthCm: 40,
      heightCm: 30, // Volumetric = 12 kg
      actualWeightKg: 3, // Billable = 12 kg
      orderType: 'B2C',
      paymentType: 'PREPAID',
    };

    const breakdown = calculateCharge(input, zones, rateCards, codConfigs);

    expect(breakdown.isIntraZone).toBe(false);
    expect(breakdown.volumetricWeightKg).toBe(12);
    expect(breakdown.billableWeightKg).toBe(12);
    expect(breakdown.baseCharge).toBe(100);
    expect(breakdown.weightCharge).toBe(240); // 12 kg * 20/kg
    expect(breakdown.subtotal).toBe(340);
    expect(breakdown.codSurcharge).toBe(0);
    expect(breakdown.totalCharge).toBe(340);
  });

  it('applies COD surcharge correctly: flat fee + percentage of subtotal', () => {
    const input: QuoteInput = {
      pickupPincode: '110001',
      dropPincode: '110091',
      lengthCm: 20,
      breadthCm: 20,
      heightCm: 25, // Volumetric = 2 kg
      actualWeightKg: 1, // Billable = 2 kg
      orderType: 'B2C',
      paymentType: 'COD',
    };

    // Subtotal = 100 base + 2*20 weight = 140
    // COD surcharge = 25 flat + 2% of 140 = 25 + 2.80 = 27.80
    // Total = 140 + 27.80 = 167.80
    const breakdown = calculateCharge(input, zones, rateCards, codConfigs);

    expect(breakdown.subtotal).toBe(140);
    expect(breakdown.codSurcharge).toBe(27.8);
    expect(breakdown.totalCharge).toBe(167.8);
  });

  it('throws 422 error when pincode is not mapped to any zone', () => {
    const input: QuoteInput = {
      pickupPincode: '999999', // unmapped
      dropPincode: '110001',
      lengthCm: 10,
      breadthCm: 10,
      heightCm: 10,
      actualWeightKg: 1,
      orderType: 'B2C',
      paymentType: 'PREPAID',
    };

    expect(() => calculateCharge(input, zones, rateCards, codConfigs)).toThrow(RateEngineError);
    try {
      calculateCharge(input, zones, rateCards, codConfigs);
    } catch (err: any) {
      expect(err.statusCode).toBe(422);
      expect(err.message).toContain('Zone not configured for pickup pincode 999999');
    }
  });

  it('throws 422 error when no rate card is configured for route', () => {
    const input: QuoteInput = {
      pickupPincode: '110091', // Metro East
      dropPincode: '110001', // Downtown (no reverse rate card in mock data)
      lengthCm: 10,
      breadthCm: 10,
      heightCm: 10,
      actualWeightKg: 1,
      orderType: 'B2C',
      paymentType: 'PREPAID',
    };

    expect(() => calculateCharge(input, zones, rateCards, codConfigs)).toThrow(RateEngineError);
    try {
      calculateCharge(input, zones, rateCards, codConfigs);
    } catch (err: any) {
      expect(err.statusCode).toBe(422);
      expect(err.message).toContain('No rate card configured');
    }
  });

  it('throws 400 validation error for zero or negative dimensions or weight', () => {
    const input: QuoteInput = {
      pickupPincode: '110001',
      dropPincode: '110002',
      lengthCm: 0,
      breadthCm: 10,
      heightCm: 10,
      actualWeightKg: 1,
      orderType: 'B2C',
      paymentType: 'PREPAID',
    };

    expect(() => calculateCharge(input, zones, rateCards, codConfigs)).toThrow(RateEngineError);
    try {
      calculateCharge(input, zones, rateCards, codConfigs);
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain('Dimensions must be greater than zero');
    }
  });
});
