import {
  MASTER_BLOCK_SIZES,
  calculateBlockMetrics,
  computeBlockRequirement,
  computeMortarRequirement,
} from "./aac-calculator";

async function runTests() {
  console.log("=== RUNNING AAC CALCULATOR VERIFICATION TESTS ===");
  let passed = 0;
  let failed = 0;

  for (const s of MASTER_BLOCK_SIZES) {
    const metrics = calculateBlockMetrics(s.lengthMm, s.heightMm, s.widthMm);

    const cbmMatch = metrics.cbmDisplay === s.cbmPerBlock;
    const bpcMatch = Math.abs(metrics.blocksPerCbmDisplay - s.blocksPerCbm) <= 0.05;
    const sqftBlockMatch = metrics.sqftPerBlockDisplay === s.sqftPerBlock;
    const sqftCbmMatch = Math.abs(metrics.sqftPerCbmDisplay - s.sqftPerCbm) <= 0.05;

    if (cbmMatch && bpcMatch && sqftBlockMatch && sqftCbmMatch) {
      console.log(`✅ [PASS] Size ${s.size} (${s.widthMm}mm): CBM=${metrics.cbmDisplay}, BPC=${metrics.blocksPerCbmDisplay}, SqFt/Blk=${metrics.sqftPerBlockDisplay}, SqFt/CBM=${metrics.sqftPerCbmDisplay}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] Size ${s.size}: Expected (CBM:${s.cbmPerBlock}, BPC:${s.blocksPerCbm}, SqFt:${s.sqftPerCbm}), Got (CBM:${metrics.cbmDisplay}, BPC:${metrics.blocksPerCbmDisplay}, SqFt:${metrics.sqftPerCbmDisplay})`);
      failed++;
    }
  }

  console.log("\n=== TESTING CALCULATION MODES FOR 6\" (1000 BLOCKS) ===");
  // Test prompt example:
  // Selected Size: 6"
  // Block Quantity: 1,000
  // CBM per Block: 0.0180
  // Total CBM: 18.00
  // Total Sq.Ft.: 1,291.67
  const qRes = computeBlockRequirement({
    size: '6"',
    mode: "quantity",
    quantity: 1000,
    wastagePercent: 0,
  });

  if (qRes.cbmPerBlock === 0.0180 && qRes.totalCbm === 18.00 && Math.abs(qRes.totalSqft - 1291.67) <= 0.05) {
    console.log(`✅ [PASS] 6" 1000 blocks: Total CBM=${qRes.totalCbm}, Total SqFt=${qRes.totalSqft}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] 6" 1000 blocks failed: Got CBM=${qRes.totalCbm}, SqFt=${qRes.totalSqft}`);
    failed++;
  }

  console.log("\n=== TESTING MORTAR ESTIMATE FOR 18.00 CBM ===");
  const mortarRes = computeMortarRequirement({
    totalCbm: 18.00,
    jointThicknessMm: 3.0,
    consumptionRateKgPerCbm: 35.0,
    bagWeightKg: 40.0,
    pricePerBag: 380,
  });
  // 18.00 CBM * 35 kg = 630 kg / 40 kg = 15.75 -> 16 bags
  if (mortarRes.requiredBags === 16 && mortarRes.subtotal === 6080) {
    console.log(`✅ [PASS] Mortar 18 CBM: ${mortarRes.requiredBags} bags (40kg), Total=₹${mortarRes.totalAmount}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Mortar estimate failed: ${JSON.stringify(mortarRes)}`);
    failed++;
  }

  console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) process.exit(1);
}

runTests();
