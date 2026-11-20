import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "../models/User";

// Server চালু হলে admin না থাকলে Render-এর ADMIN_EMAIL ও ADMIN_PASSWORD দিয়ে তৈরি করে।
// Code-এ কোনো password লেখা নেই।
export async function seedAdmin(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.log("ℹ️ ADMIN_EMAIL / ADMIN_PASSWORD সেট নেই, admin তৈরি বাদ দেওয়া হলো");
    return;
  }

  const exists = await User.exists({ email: env.ADMIN_EMAIL });
  if (exists) {
    console.log("ℹ️ Admin আগে থেকেই আছে");
    return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    passwordHash,
    role: "admin",
  });
  console.log("✅ Admin তৈরি হয়েছে");
}
