"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function updateCompanyProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const legalName = String(formData.get("legalName") ?? "").trim() || "SWARNIM AAC BLOCK PRIVATE LIMITED";
  const tradeName = String(formData.get("tradeName") ?? "").trim() || "SWARNIM AAC BLOCK PRIVATE LIMITED";
  const gstin = String(formData.get("gstin") ?? "").trim().toUpperCase() || "24ABNCS5280K1ZU";
  const constitution = String(formData.get("constitution") ?? "").trim() || "Private Limited Company";
  const registeredAddress = String(formData.get("registeredAddress") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim() || "Gujarat";
  const district = String(formData.get("district") ?? "").trim() || "Ahmedabad";
  const registrationDate = String(formData.get("registrationDate") ?? "").trim() || "07/08/2024";
  const registrationType = String(formData.get("registrationType") ?? "").trim() || "Regular";
  const contactPerson = String(formData.get("contactPerson") ?? "").trim() || null;
  const companyMobile = String(formData.get("companyMobile") ?? "").trim() || null;
  const altMobile = String(formData.get("altMobile") ?? "").trim() || null;
  const companyEmail = String(formData.get("companyEmail") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const factoryAddress = String(formData.get("factoryAddress") ?? "").trim() || null;
  const factoryContact = String(formData.get("factoryContact") ?? "").trim() || null;
  const officeAddress = String(formData.get("officeAddress") ?? "").trim() || null;
  const signatoryName = String(formData.get("signatoryName") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const stampUrl = String(formData.get("stampUrl") ?? "").trim() || null;

  const existing = await prisma.companyProfile.findFirst();

  if (existing) {
    await prisma.companyProfile.update({
      where: { id: existing.id },
      data: {
        legalName,
        tradeName,
        gstin,
        constitution,
        registeredAddress,
        state,
        district,
        registrationDate,
        registrationType,
        contactPerson,
        companyMobile,
        altMobile,
        companyEmail,
        website,
        factoryAddress,
        factoryContact,
        officeAddress,
        signatoryName,
        logoUrl,
        stampUrl,
      },
    });
  } else {
    await prisma.companyProfile.create({
      data: {
        legalName,
        tradeName,
        gstin,
        constitution,
        registeredAddress,
        state,
        district,
        registrationDate,
        registrationType,
        contactPerson,
        companyMobile,
        altMobile,
        companyEmail,
        website,
        factoryAddress,
        factoryContact,
        officeAddress,
        signatoryName,
        logoUrl,
        stampUrl,
      },
    });
  }

  revalidatePath("/admin/company-profile");
  revalidatePath("/admin/dashboard");
  redirect("/admin/company-profile?success=1");
}
