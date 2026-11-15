import { prisma } from "@/lib/prisma";
export * from "@/lib/company-profile-types";
import { CompanyProfileData, DEFAULT_COMPANY_PROFILE } from "@/lib/company-profile-types";

export async function getCompanyProfile(): Promise<CompanyProfileData> {
  try {
    const profile = await prisma.companyProfile.findFirst();
    if (!profile) return DEFAULT_COMPANY_PROFILE;
    return profile as CompanyProfileData;
  } catch (err) {
    console.error("Failed to fetch company profile, using default:", err);
    return DEFAULT_COMPANY_PROFILE;
  }
}
