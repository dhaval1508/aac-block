import { prisma } from "../lib/prisma";
import { generateSecureQrToken } from "../lib/qr";

async function main() {
  console.log("Checking orders missing QR codes...");
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      qrCode: null,
    },
    select: {
      id: true,
      orderNo: true,
    },
  });

  console.log(`Found ${orders.length} orders without QR codes.`);

  let created = 0;
  for (const ord of orders) {
    const token = generateSecureQrToken();
    await prisma.orderQrCode.create({
      data: {
        orderId: ord.id,
        token,
        status: "ACTIVE",
        createdByName: "System Migration",
      },
    });
    created++;
    if (created % 10 === 0 || created === orders.length) {
      console.log(`Generated QR for ${created}/${orders.length} orders...`);
    }
  }

  const totalQrs = await prisma.orderQrCode.count();
  console.log(`=== Done! Total QR codes in database: ${totalQrs} ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
