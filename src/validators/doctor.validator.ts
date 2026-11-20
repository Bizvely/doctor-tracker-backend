import { z } from "zod";

// ফাঁকা string এলে "দেওয়া হয়নি" ধরা
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Invalid date")
    .optional()
);

// Doctor তৈরি ও edit-এর data: অতিরিক্ত field পাঠালে .strict() আটকাবে
export const doctorSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    specialization: z.string().trim().min(2).max(80),
    hospital: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{5,18}$/, "Invalid phone number")
      .transform((value) => value.replace(/[\s-]/g, "")),
    email: z.string().trim().toLowerCase().email().max(120),
  })
  .strict();

export type DoctorInput = z.infer<typeof doctorSchema>;

// তালিকার URL query (?search=...&page=2) যাচাই। ভুল ধরনের মান (যেমন search[$ne]=x) বাতিল হয়।
export const listDoctorsQuerySchema = z
  .object({
    search: z.string().trim().max(60).optional(),
    specialization: z.string().trim().max(80).optional(),
    hospital: z.string().trim().max(120).optional(),
    from: optionalDate,
    to: optionalDate,
    sort: z.enum(["newest", "oldest", "name"]).default("newest"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict()
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: "from date must be before to date",
    path: ["from"],
  });

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
