import bcrypt from "bcryptjs";
import { User } from "../models/User";
import type { LoginInput } from "../validators/auth.validator";
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
