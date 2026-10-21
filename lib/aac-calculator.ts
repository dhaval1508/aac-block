/**
 * Swarnim AAC Block Calculator & Mortar Engine
 * Strict implementation of Master Block Size Table & Engineering Formulas
 */

export interface BlockSizeSpec {
  size: string; // e.g. '3"', '4"', '4+"', '5"', '6"', '8"', '9"', '9+"', '12"'
  name: string;
  lengthMm: number; // 600
  heightMm: number; // 200
  widthMm: number;  // 75, 100, 115, 125, 150, 200, 225, 230, 300
  cbmPerBlock: number;
  blocksPerCbm: number;
  sqftPerBlock: number;
  sqftPerCbm: number;
}

export const SQFT_CONVERSION_FACTOR = 10.7639104167;

export const MASTER_BLOCK_SIZES: BlockSizeSpec[] = [
  {
    size: '3 Inch',
    name: '3 Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 75,
    cbmPerBlock: 0.0090,
    blocksPerCbm: 111.11,
    sqftPerBlock: 1.29,
    sqftPerCbm: 143.52,
  },
  {
    size: '4 Inch',
    name: '4 Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 100,
    cbmPerBlock: 0.0120,
    blocksPerCbm: 83.33,
    sqftPerBlock: 1.29,
    sqftPerCbm: 107.64,
  },
  {
    size: '4+ Inch',
    name: '4+ Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 115,
    cbmPerBlock: 0.0138,
    blocksPerCbm: 72.46,
    sqftPerBlock: 1.29,
    sqftPerCbm: 93.60,
  },
  {
    size: '5 Inch',
    name: '5 Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 125,
    cbmPerBlock: 0.0150,
    blocksPerCbm: 66.67,
    sqftPerBlock: 1.29,
    sqftPerCbm: 86.11,
  },
  {
    size: '6 Inch',
    name: '6 Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 150,
    cbmPerBlock: 0.0180,
    blocksPerCbm: 55.56,
    sqftPerBlock: 1.29,
    sqftPerCbm: 71.76,
  },
  {
    size: '8 Inch',
    name: '8 Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 200,
    cbmPerBlock: 0.0240,
    blocksPerCbm: 41.67,
    sqftPerBlock: 1.29,
    sqftPerCbm: 53.82,
  },
  {
    size: '9 Inch',
    name: '9 Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 225,
    cbmPerBlock: 0.0270,
    blocksPerCbm: 37.04,
    sqftPerBlock: 1.29,
    sqftPerCbm: 47.84,
  },
  {
    size: '9+ Inch',
    name: '9+ Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 230,
    cbmPerBlock: 0.0276,
    blocksPerCbm: 36.23,
    sqftPerBlock: 1.29,
    sqftPerCbm: 46.80,
  },
  {
    size: '12 Inch',
    name: '12 Inch AAC Block',
    lengthMm: 600,
    heightMm: 200,
    widthMm: 300,
    cbmPerBlock: 0.0360,
    blocksPerCbm: 27.78,
    sqftPerBlock: 1.29,
    sqftPerCbm: 35.88,
  },
];

/**
 * Exact formulas calculated at full double precision
 */
export function calculateBlockMetrics(lengthMm: number, heightMm: number, widthMm: number) {
  const cbmExact = (lengthMm * heightMm * widthMm) / 1_000_000_000;
  const blocksPerCbmExact = 1 / cbmExact;
  const sqftPerBlockExact = ((lengthMm * heightMm) / 1_000_000) * SQFT_CONVERSION_FACTOR;
  const sqftPerCbmExact = sqftPerBlockExact / cbmExact;

  return {
    cbmExact,
    blocksPerCbmExact,
    sqftPerBlockExact,
    sqftPerCbmExact,
    cbmDisplay: Number(cbmExact.toFixed(4)),
    blocksPerCbmDisplay: Number(blocksPerCbmExact.toFixed(2)),
    sqftPerBlockDisplay: Number(sqftPerBlockExact.toFixed(2)),
    sqftPerCbmDisplay: Number(sqftPerCbmExact.toFixed(2)),
  };
}

export type CalcMode = 'quantity' | 'cbm' | 'area';

export interface CalculatorInput {
  size: string; // e.g. '6"'
  mode: CalcMode;
  quantity?: number;
  cbm?: number;
  wallAreaSqft?: number;
  wastagePercent?: number; // 0 to 20%
  ratePerBlock?: number;
}

export interface CalculatorResult {
  spec: BlockSizeSpec;
  inputMode: CalcMode;
  baseBlocks: number;
  wastagePercent: number;
  wastageBlocks: number;
  finalBlocks: number;
  cbmPerBlock: number;
  totalCbm: number;
  blocksPerCbm: number;
  sqftPerBlock: number;
  totalSqft: number;
  ratePerBlock: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
}

export function computeBlockRequirement(input: CalculatorInput): CalculatorResult {
  const cleanInput = (input.size || "").trim();
  const spec = MASTER_BLOCK_SIZES.find((s) => 
    s.size.toLowerCase() === cleanInput.toLowerCase() || 
    s.name.toLowerCase() === cleanInput.toLowerCase() ||
    cleanInput.startsWith(s.size) ||
    s.size.startsWith(cleanInput.replace(/"/g, ' Inch'))
  ) || MASTER_BLOCK_SIZES[4]; // Default 6 Inch
  const wastage = Math.max(0, input.wastagePercent || 0);

  let baseBlocks = 0;

  if (input.mode === 'quantity') {
    baseBlocks = Math.max(0, Math.floor(input.quantity || 0));
  } else if (input.mode === 'cbm') {
    const targetCbm = Math.max(0, input.cbm || 0);
    // Math.ceil(Required CBM / CBM per Block)
    baseBlocks = Math.ceil(targetCbm / spec.cbmPerBlock);
  } else if (input.mode === 'area') {
    const targetArea = Math.max(0, input.wallAreaSqft || 0);
    // Area calculation fallback
    const exactSqftPerBlock = ((spec.lengthMm * spec.heightMm) / 1_000_000) * SQFT_CONVERSION_FACTOR;
    baseBlocks = Math.ceil(targetArea / exactSqftPerBlock);
  }

  const wastageBlocks = Math.ceil(baseBlocks * (wastage / 100));
  const finalBlocks = baseBlocks + wastageBlocks;

  const totalCbm = Number((finalBlocks * spec.cbmPerBlock).toFixed(4));
  const totalSqft = Number((finalBlocks * (((spec.lengthMm * spec.heightMm) / 1_000_000) * SQFT_CONVERSION_FACTOR)).toFixed(2));

  const rate = input.ratePerBlock || 0;
  const subtotal = Number((finalBlocks * rate).toFixed(2));
  const gstAmount = Number((subtotal * 0.18).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  return {
    spec,
    inputMode: input.mode,
    baseBlocks,
    wastagePercent: wastage,
    wastageBlocks,
    finalBlocks,
    cbmPerBlock: spec.cbmPerBlock,
    totalCbm,
    blocksPerCbm: spec.blocksPerCbm,
    sqftPerBlock: spec.sqftPerBlock,
    totalSqft,
    ratePerBlock: rate,
    subtotal,
    gstAmount,
    totalAmount,
  };
}

/**
 * Verified Mortar Calculator
 * Swarnim Block Jointing Mortar: 40 Kg bag
 * Industry standard consumption for 3mm thin joint: ~35 kg per CBM of AAC masonry
 */
export interface MortarCalculatorInput {
  totalCbm: number;
  jointThicknessMm?: number; // default 3mm
  consumptionRateKgPerCbm?: number; // default 35 kg/CBM
  wastagePercent?: number; // e.g. 5%
  bagWeightKg?: number; // default 40 kg
  pricePerBag?: number; // default 380
}

export interface MortarCalculatorResult {
  totalCbm: number;
  jointThicknessMm: number;
  consumptionRateKgPerCbm: number;
  requiredMortarKg: number;
  wastagePercent: number;
  finalMortarKg: number;
  bagWeightKg: number;
  requiredBags: number;
  pricePerBag: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
}

export function computeMortarRequirement(input: MortarCalculatorInput): MortarCalculatorResult {
  const thickness = input.jointThicknessMm || 3.0;
  const baseRate = input.consumptionRateKgPerCbm || 35.0; // 35 kg per CBM at 3mm
  // Adjust rate if thickness varies from 3mm:
  const adjustedRate = baseRate * (thickness / 3.0);
  const wastage = Math.max(0, input.wastagePercent || 0);
  const bagWeight = input.bagWeightKg || 40.0;
  const price = input.pricePerBag || 380.0;

  const requiredMortarKg = Number((input.totalCbm * adjustedRate).toFixed(2));
  const finalMortarKg = Number((requiredMortarKg * (1 + wastage / 100)).toFixed(2));
  const requiredBags = finalMortarKg > 0 ? Math.ceil(finalMortarKg / bagWeight) : 0;

  const subtotal = Number((requiredBags * price).toFixed(2));
  const gstAmount = Number((subtotal * 0.18).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  return {
    totalCbm: input.totalCbm,
    jointThicknessMm: thickness,
    consumptionRateKgPerCbm: adjustedRate,
    requiredMortarKg,
    wastagePercent: wastage,
    finalMortarKg,
    bagWeightKg: bagWeight,
    requiredBags,
    pricePerBag: price,
    subtotal,
    gstAmount,
    totalAmount,
  };
}
