import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Company Profile and Delivery Challan Sequence...");

  const existingProfile = await prisma.companyProfile.findFirst();
  if (!existingProfile) {
    const profile = await prisma.companyProfile.create({
      data: {
        legalName: "SWARNIM AAC BLOCK PRIVATE LIMITED",
        tradeName: "SWARNIM AAC BLOCK PRIVATE LIMITED",
        gstin: "24ABNCS5280K1ZU",
        constitution: "Private Limited Company",
        registeredAddress:
          "Office No. 615, D-6th Floor, Ganesh Glory 11, Jagatpur Chenpur Road, Ahmedabad, Gujarat - 382470",
        state: "Gujarat",
        district: "Ahmedabad",
        registrationDate: "07/08/2024",
        registrationType: "Regular",
        officeAddress:
          "Office No. 615, D-6th Floor, Ganesh Glory 11, Jagatpur Chenpur Road, Ahmedabad, Gujarat - 382470",
        factoryAddress:
          "Swarnim AAC Block Plant, Survey No. 42, Jagatpur Road, Ahmedabad, Gujarat - 382470",
        companyMobile: "+91 98795 00000",
        companyEmail: "info@swarnimaac.com",
        website: "https://swarnimaac.com",
        signatoryName: "Authorized Signatory",
      },
    });
    console.log("✅ Company profile seeded:", profile.legalName);
  } else {
    console.log("ℹ️ Company profile already exists:", existingProfile.legalName);
  }

  const existingSeq = await prisma.deliveryChallanSequence.findFirst();
  if (!existingSeq) {
    await prisma.deliveryChallanSequence.create({
      data: {
        currentValue: 0,
      },
    });
    console.log("✅ Delivery Challan sequence initialized to 0 (Next will be SAB/DC/0001).");
  } else {
    console.log("ℹ️ Delivery Challan sequence already initialized at:", existingSeq.currentValue);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
