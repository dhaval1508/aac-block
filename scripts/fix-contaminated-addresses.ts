import { prisma } from "../lib/prisma";

async function fixContaminatedAddresses() {
  console.log("Starting address correction on contaminated database records...\n");

  // Specific fix for Order SWA-2026-1042 (INV-2026-0036)
  const o1042 = await prisma.order.findFirst({
    where: { OR: [{ orderNo: "SWA-2026-1042" }, { invoiceNo: "INV-2026-0036" }] },
    include: { customer: true },
  });

  if (o1042) {
    const targetAddress = "Chorpura Primary School, Ta. Savli, Dist. Vadodara - 391770";
    await prisma.order.update({
      where: { id: o1042.id },
      data: {
        deliveryAddress: targetAddress,
        formattedAddress: targetAddress,
        customSiteName: "Chorpura Primary School Site",
        city: "Vadodara",
        district: "Vadodara",
        pincode: "391770",
      },
    });
    console.log(`✓ Fixed order ${o1042.orderNo} (${o1042.invoiceNo}):`);
    console.log(`  New deliveryAddress: ${targetAddress}`);
    console.log(`  New customSiteName: Chorpura Primary School Site`);
    console.log(`  New city: Vadodara\n`);
  }

  // Scan and clean other orders contaminated with erroneous ", Ahmedabad"
  const candidateOrders = await prisma.order.findMany({
    where: {
      deliveryAddress: { contains: "Ahmedabad" },
    },
    include: { customer: true },
  });

  let cleanedCount = 0;

  for (const o of candidateOrders) {
    const custCity = (o.customer?.city || "").trim();
    const currentAddr = o.deliveryAddress || "";

    // Skip orders that are genuinely in Ahmedabad and whose customer is in Ahmedabad
    const isGenuinelyAhmedabad =
      custCity.toLowerCase() === "ahmedabad" &&
      (currentAddr.includes("Science City") ||
        currentAddr.includes("Nikol") ||
        currentAddr.includes("Bopal") ||
        currentAddr.includes("SG Highway") ||
        currentAddr.includes("Kadipur") ||
        currentAddr.includes("3800") ||
        currentAddr.includes("3824"));

    if (isGenuinelyAhmedabad) {
      continue;
    }

    // Check if the address has a non-Ahmedabad city or if customer is non-Ahmedabad
    const hasNonAhmedabadIndicator =
      custCity && custCity.toLowerCase() !== "ahmedabad" ||
      currentAddr.toLowerCase().includes("vadodara") ||
      currentAddr.toLowerCase().includes("vadodra") ||
      currentAddr.toLowerCase().includes("padra") ||
      currentAddr.toLowerCase().includes("savli") ||
      currentAddr.toLowerCase().includes("goriyad") ||
      currentAddr.toLowerCase().includes("khandiwada") ||
      currentAddr.toLowerCase().includes("asoj") ||
      currentAddr.toLowerCase().includes("anand") ||
      currentAddr.toLowerCase().includes("waghodiya") ||
      currentAddr.toLowerCase().includes("lilora") ||
      currentAddr.toLowerCase().includes("vesaniya") ||
      currentAddr.toLowerCase().includes("amodar") ||
      currentAddr.toLowerCase().includes("harni") ||
      currentAddr.toLowerCase().includes("chokari");

    if (hasNonAhmedabadIndicator) {
      // Strip erroneous ", Ahmedabad" or ", Ahmedabad - <pincode>"
      let newAddr = currentAddr
        .replace(/,\s*Ahmedabad(?:\s*-\s*\d{6})?/gi, "")
        .replace(/[,\s-]+$/, "")
        .trim();

      // Clean duplicate consecutive words or formatting
      newAddr = newAddr.replace(/,\s*,/g, ",");

      const resolvedCity =
        custCity && custCity.toLowerCase() !== "ahmedabad"
          ? custCity
          : currentAddr.toLowerCase().includes("vadodara") || currentAddr.toLowerCase().includes("vadodra")
          ? "Vadodara"
          : currentAddr.toLowerCase().includes("anand")
          ? "Anand"
          : currentAddr.toLowerCase().includes("asoj")
          ? "Asoj"
          : currentAddr.toLowerCase().includes("waghodiya")
          ? "Waghodiya"
          : null;

      await prisma.order.update({
        where: { id: o.id },
        data: {
          deliveryAddress: newAddr,
          formattedAddress: newAddr,
          city: resolvedCity,
        },
      });

      console.log(`✓ Cleaned order ${o.orderNo}:`);
      console.log(`  Before: ${currentAddr}`);
      console.log(`  After:  ${newAddr}`);
      console.log(`  City:   ${resolvedCity}\n`);
      cleanedCount++;
    }
  }

  console.log(`Database address cleanup complete. Cleaned ${cleanedCount} orders.`);
}

fixContaminatedAddresses()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

