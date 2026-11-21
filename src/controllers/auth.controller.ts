import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "../models/User";
import type { ChangePasswordInput, LoginInput } from "../validators/auth.validator";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AUTH_COOKIE_NAME, authCookieOptions, signAuthToken } from "../utils/jwt";

// ইউজার না থাকলেও একই সময় লাগানোর জন্য নকল hash (timing আক্রমণ ঠেকাতে)
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ email }).select("+passwordHash");
  const isMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  // ভুল email আর ভুল password, দুই ক্ষেত্রে একই বার্তা
  if (!user || !isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = signAuthToken({ userId: user.id, role: "admin" });
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());

  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: "admin" },
  });
});

export const logout = asyncHandler(async (_req, res) => {
  // maxAge বাদ দিয়ে একই সেটিং দিলে cookie মুছে যায়
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
  res.json({ success: true, message: "Logged out" });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// Password বদল: আগের password ঠিক হলে তবেই নতুনটা বসে
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  // Demo account-এর password বদলানো বন্ধ (interviewer যেন নিজেও আটকে না যায়, আপনাকেও না আটকায়)
  if (env.DEMO_USER_EMAIL && req.user.email === env.DEMO_USER_EMAIL) {
    throw new ApiError(403, "Password cannot be changed for the demo account.");
  }

  const user = await User.findById(req.user.id).select("+passwordHash");
  if (!user) {
    throw new ApiError(401, "Invalid or expired session");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    // 401 নয়, 400: নইলে frontend ভাববে session শেষ আর নিজে logout করে দেবে
    throw new ApiError(400, "Current password is incorrect");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  // এই ব্রাউজারের জন্য নতুন টিকিট দেওয়া হয়, তাই আপনি logout হবেন না। অন্য সব জায়গার পুরোনো টিকিট বাতিল।
  const token = signAuthToken({ userId: user.id, role: "admin" });
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());

  res.json({ success: true, message: "Password changed" });
});
