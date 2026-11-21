import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "../models/User";

// নির্দিষ্ট email-এর ইউজার না থাকলে তৈরি করে। থাকলে কিছুই বদলায় না (তাই Settings-এ বদলানো password ঠিক থাকে)।
async function createUserIfMissing(name: string, email: string, password: string, label: string): Promise<void> {
  const exists = await User.exists({ email });
  if (exists) {
    console.log(`ℹ️ ${label} আগে থেকেই আছে`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash, role: "admin" });
  console.log(`✅ ${label} তৈরি হয়েছে`);
}

// Server চালু হলে admin ও demo account না থাকলে Render-এর ENV দিয়ে তৈরি করে।
// Code-এ কোনো password লেখা নেই।
export async function seedAdmin(): Promise<void> {
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    await createUserIfMissing(env.ADMIN_NAME, env.ADMIN_EMAIL, env.ADMIN_PASSWORD, "Admin");
  } else {
    console.log("ℹ️ ADMIN_EMAIL / ADMIN_PASSWORD সেট নেই, admin তৈরি বাদ দেওয়া হলো");
  }

  if (env.DEMO_USER_EMAIL && env.DEMO_USER_PASSWORD) {
    await createUserIfMissing("Demo Admin", env.DEMO_USER_EMAIL, env.DEMO_USER_PASSWORD, "Demo account");
  }
}
