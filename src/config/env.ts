import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// সব environment variable এখানে যাচাই হয়। ভুল বা অনুপস্থিত থাকলে server শুরুই হবে না।
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI দিতে হবে"),
  CLIENT_ORIGIN: z.string().min(1).default("http://localhost:3000"),

  // Login টিকিট সই করার গোপন চাবি। কমপক্ষে ৩২ অক্ষর।
  JWT_SECRET: z.string().min(32, "JWT_SECRET কমপক্ষে ৩২ অক্ষরের হতে হবে"),

  // Cookie একই site-এর (যেমন *.bizvely.com) জন্য "lax" ঠিক আছে
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

  // প্রথমবার admin তৈরির জন্য (দুটোই না দিলে admin তৈরি হবে না)
  ADMIN_NAME: z.string().trim().min(1).max(80).default("Admin"),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email().optional(),
  ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD কমপক্ষে ১২ অক্ষরের হতে হবে").optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment variable ভুল বা অনুপস্থিত:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  // কমা দিয়ে আলাদা করা origin গুলো তালিকা হিসেবে
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(",")
    .map((item) => item.trim())
    .filter(Boolean),
};
