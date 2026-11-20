import { z } from "zod";

// Login-এ অতিরিক্ত field পাঠালে .strict() সেটা আটকায়
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(120),
    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
