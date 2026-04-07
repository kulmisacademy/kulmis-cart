import { z } from "zod";
import { SOMALI_REGIONS } from "@/lib/somali-regions";

const REGION_SET = new Set<string>(SOMALI_REGIONS);

/** Digits only, 9–15 chars after normalizing (allows +252 etc. in UI). */
const phoneDigits = z
  .string()
  .min(1, "Required")
  .transform((s) => s.replace(/\D/g, ""))
  .refine((d) => d.length >= 9 && d.length <= 15, "Enter a valid phone number");

export const vendorRegistrationSchema = z
  .object({
    storeName: z.string().min(1, "Store name is required").max(120),
    /** Single contact number used for calls and WhatsApp orders. */
    primaryPhone: phoneDigits,
    region: z.string().min(1, "Select a region").refine((r) => REGION_SET.has(r), "Select a valid region"),
    district: z.string().min(1, "District is required").max(100),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    logo: z.custom<File | undefined>((val) => val === undefined || val instanceof File).optional(),
    banner: z.custom<File | undefined>((val) => val === undefined || val instanceof File).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (!(data.logo instanceof File) || data.logo.size === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Store logo is required", path: ["logo"] });
    } else {
      const okType = data.logo.type === "image/jpeg" || data.logo.type === "image/png";
      if (!okType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use JPG or PNG only", path: ["logo"] });
      }
      if (data.logo.size > 2 * 1024 * 1024) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Logo must be under 2 MB", path: ["logo"] });
      }
    }
    if (data.banner instanceof File && data.banner.size > 0) {
      const okBanner = data.banner.type === "image/jpeg" || data.banner.type === "image/png";
      if (!okBanner) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Banner: use JPG or PNG only", path: ["banner"] });
      }
      if (data.banner.size > 2 * 1024 * 1024) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Banner must be under 2 MB", path: ["banner"] });
      }
    }
  });

export type VendorRegistrationInput = z.infer<typeof vendorRegistrationSchema>;
export type VendorRegistrationFormValues = z.input<typeof vendorRegistrationSchema>;
