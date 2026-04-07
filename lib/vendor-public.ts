import type { ApprovedVendorRecord, VendorPublic } from "@/lib/approved-vendors";

export function toVendorPublic(vendor: ApprovedVendorRecord): VendorPublic {
  const { passwordHash, ...rest } = vendor;
  void passwordHash;
  return rest;
}
