export interface QuoteInput {
  pickupPincode: string;
  dropPincode: string;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  actualWeightKg: number;
  orderType: 'B2B' | 'B2C';
  paymentType: 'PREPAID' | 'COD';
}

export interface ZoneData {
  id: string;
  name: string;
  pincodes?: string[];
  pincodeMaps?: { pincode: string }[];
}

export interface RateCardData {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  orderType: 'B2B' | 'B2C';
  baseRate: number;
  perKgRate: number;
}

export interface CodConfigData {
  orderType: 'B2B' | 'B2C';
  flatFee: number;
  percentOfBill: number;
}

export interface ChargeBreakdown {
  pickupZoneId: string;
  pickupZoneName: string;
  dropZoneId: string;
  dropZoneName: string;
  isIntraZone: boolean;
  volumetricWeightKg: number;
  billableWeightKg: number;
  rateCardId: string;
  baseCharge: number;
  weightCharge: number;
  subtotal: number;
  codSurcharge: number;
  totalCharge: number;
}

export class RateEngineError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = 'RateEngineError';
    this.statusCode = statusCode;
  }
}

export function getIndianStateForPincode(pincode: string): string {
  const clean = pincode.trim();
  if (!/^\d{6}$/.test(clean)) return 'Other Region';

  const prefix = clean.slice(0, 2);
  switch (prefix) {
    case '11': return 'Delhi';
    case '12': case '13': return 'Haryana';
    case '14': case '15': return 'Punjab';
    case '16': return 'Chandigarh';
    case '17': return 'Himachal Pradesh';
    case '18': case '19': return 'Jammu & Kashmir';
    case '20': case '21': case '22': case '23': case '24': case '25': case '26': case '27': case '28': return 'Uttar Pradesh';
    case '30': case '31': case '32': case '33': case '34': return 'Rajasthan';
    case '36': case '37': case '38': case '39': return 'Gujarat';
    case '40': case '41': case '42': case '43': case '44': return 'Maharashtra';
    case '45': case '46': case '47': case '48': return 'Madhya Pradesh';
    case '49': return 'Chhattisgarh';
    case '50': case '51': case '52': case '53': return 'Telangana';
    case '56': case '57': case '58': case '59': return 'Karnataka';
    case '60': case '61': case '62': case '63': case '64': return 'Tamil Nadu';
    case '67': case '68': case '69': return 'Kerala';
    case '70': case '71': case '72': case '73': case '74': return 'West Bengal';
    case '75': case '76': case '77': return 'Odisha';
    case '78': case '79': return 'Assam';
    case '80': case '81': case '82': case '83': case '84': case '85': return 'Bihar';
    default: return 'India';
  }
}

export function findZoneForPincode(pincode: string, zones: ZoneData[]): ZoneData | null {
  const cleanPincode = pincode.trim();

  // 1. Direct match on pincode maps or pincodes array
  for (const zone of zones) {
    if (zone.pincodes && zone.pincodes.includes(cleanPincode)) {
      return zone;
    }
    if (zone.pincodeMaps && zone.pincodeMaps.some(pm => pm.pincode === cleanPincode)) {
      return zone;
    }
  }

  // 2. Intelligent Regional Fallback for Valid Indian 6-digit Pincodes
  if (/^[1-8]\d{5}$/.test(cleanPincode)) {
    const prefix = cleanPincode.slice(0, 2);

    const northPrefixes = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28'];
    const westPrefixes = ['30', '31', '32', '33', '34', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49'];
    const southPrefixes = ['50', '51', '52', '53', '56', '57', '58', '59', '60', '61', '62', '63', '64', '67', '68', '69'];
    const eastPrefixes = ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85'];

    if (northPrefixes.includes(prefix)) {
      const match = zones.find(z => z.name.toLowerCase().includes('downtown') || z.name.toLowerCase().includes('north'));
      if (match) return match;
    }
    if (southPrefixes.includes(prefix)) {
      const match = zones.find(z => z.name.toLowerCase().includes('metro') || z.name.toLowerCase().includes('south'));
      if (match) return match;
    }
    if (westPrefixes.includes(prefix) || eastPrefixes.includes(prefix)) {
      const match = zones.find(z => z.name.toLowerCase().includes('west') || z.name.toLowerCase().includes('heights'));
      if (match) return match;
    }
    return zones[0] || null;
  }

  return null;
}

export function calculateVolumetricWeight(lengthCm: number, breadthCm: number, heightCm: number): number {
  if (lengthCm <= 0 || breadthCm <= 0 || heightCm <= 0) {
    throw new RateEngineError('Dimensions must be greater than zero', 400);
  }
  const volWeight = (lengthCm * breadthCm * heightCm) / 5000;
  return Math.round(volWeight * 100) / 100;
}

export function calculateCharge(
  input: QuoteInput,
  zones: ZoneData[],
  rateCards: RateCardData[],
  codConfigs: CodConfigData[]
): ChargeBreakdown {
  // 0. Validate inputs
  if (input.actualWeightKg <= 0) {
    throw new RateEngineError('Actual weight must be greater than zero', 400);
  }

  // 1. Zone detection
  const pickupZone = findZoneForPincode(input.pickupPincode, zones);
  if (!pickupZone) {
    throw new RateEngineError(`Zone not configured for pickup pincode ${input.pickupPincode}`, 422);
  }

  const dropZone = findZoneForPincode(input.dropPincode, zones);
  if (!dropZone) {
    throw new RateEngineError(`Zone not configured for drop pincode ${input.dropPincode}`, 422);
  }

  const isIntraZone = pickupZone.id === dropZone.id;

  // 2. Volumetric weight
  const volumetricWeightKg = calculateVolumetricWeight(input.lengthCm, input.breadthCm, input.heightCm);

  // 3. Billable weight
  const billableWeightKg = Math.round(Math.max(input.actualWeightKg, volumetricWeightKg) * 100) / 100;

  // 4. Rate card lookup
  let rateCard = rateCards.find(
    rc => rc.fromZoneId === pickupZone.id && rc.toZoneId === dropZone.id && rc.orderType === input.orderType
  );

  if (!rateCard && isIntraZone) {
    rateCard = rateCards.find(rc => rc.orderType === input.orderType);
  }

  if (!rateCard) {
    throw new RateEngineError(
      `No rate card configured for route from ${pickupZone.name} to ${dropZone.name} (${input.orderType})`,
      422
    );
  }

  // 5. Base charge
  const baseCharge = Math.round(rateCard.baseRate * 100) / 100;

  // 6. Weight charge
  const weightCharge = Math.round(billableWeightKg * rateCard.perKgRate * 100) / 100;

  // 7. Subtotal
  const subtotal = Math.round((baseCharge + weightCharge) * 100) / 100;

  // 8. COD Surcharge
  let codSurcharge = 0;
  if (input.paymentType === 'COD') {
    const codConfig = codConfigs.find(c => c.orderType === input.orderType);
    if (codConfig) {
      const percentageFee = (codConfig.percentOfBill / 100) * subtotal;
      codSurcharge = Math.round((codConfig.flatFee + percentageFee) * 100) / 100;
    }
  }

  // 9. Total charge
  const totalCharge = Math.round((subtotal + codSurcharge) * 100) / 100;

  return {
    pickupZoneId: pickupZone.id,
    pickupZoneName: pickupZone.name,
    dropZoneId: dropZone.id,
    dropZoneName: dropZone.name,
    isIntraZone,
    volumetricWeightKg,
    billableWeightKg,
    rateCardId: rateCard.id,
    baseCharge,
    weightCharge,
    subtotal,
    codSurcharge,
    totalCharge,
  };
}
