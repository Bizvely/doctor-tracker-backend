import { z } from "zod";

// Login-এ অতিরিক্ত field পাঠালে .strict() সেটা আটকায়
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(120),
    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

// Password বদল: নতুনটা ১২–৭২ অক্ষর (bcrypt ৭২ বাইটের পরের অংশ বাদ দেয়), আর আগেরটা থেকে আলাদা
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12, "must be at least 12 characters").max(72, "must be at most 72 characters"),
  })
  .strict()
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "must be different from the current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
