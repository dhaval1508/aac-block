import { prisma } from "@/lib/prisma";

/**
 * Atomically generates the next Delivery Challan Number in the sequence:
 * SAB/DC/0001, SAB/DC/0002, etc.
 * Uses a transaction-safe row increment.
 */
export async function getNextDeliveryChallanNumber(): Promise<string> {
  return await prisma.$transaction(async (tx: any) => {
    let seq = await tx.deliveryChallanSequence.findFirst();
    if (!seq) {
      seq = await tx.deliveryChallanSequence.create({
        data: { currentValue: 0 },
      });
    }

    const updated = await tx.deliveryChallanSequence.update({
      where: { id: seq.id },
      data: { currentValue: { increment: 1 } },
    });

    const paddedNumber = String(updated.currentValue).padStart(4, "0");
    return `SAB/DC/${paddedNumber}`;
  });
}
