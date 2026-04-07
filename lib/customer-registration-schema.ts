import { z } from "zod";
import { SOMALI_REGIONS } from "@/lib/somali-regions";

const REGION_SET = new Set<string>(SOMALI_REGIONS);

export const customerRegisterSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    phone: z.string().min(5, "Enter a valid phone number"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    region: z.string().min(1, "Select a region").refine((r) => REGION_SET.has(r), "Select a valid region"),
    district: z.string().min(1, "Enter your district"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
