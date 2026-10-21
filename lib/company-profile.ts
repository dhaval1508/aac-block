import { prisma } from "@/lib/prisma";

export interface CompanyProfileData {
  id: string;
  legalName: string;
  tradeName: string;
  gstin: string;
  constitution: string;
  registeredAddress: string;
  state: string;
  district: string;
  registrationDate: string;
  registrationType: string;
  contactPerson?: string | null;
  companyMobile?: string | null;
  altMobile?: string | null;
  companyEmail?: string | null;
  website?: string | null;
  factoryAddress?: string | null;
  factoryContact?: string | null;
  officeAddress?: string | null;
  signatoryName?: string | null;
  logoUrl?: string | null;
  stampUrl?: string | null;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfileData = {
  id: "default",
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
};

export async function getCompanyProfile(): Promise<CompanyProfileData> {
  try {
    const profile = await prisma.companyProfile.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (profile) return profile;
  } catch (err) {
    console.error("Failed to load company profile from DB:", err);
  }
  return DEFAULT_COMPANY_PROFILE;
}
