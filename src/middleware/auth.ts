import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { AUTH_COOKIE_NAME, verifyAuthToken, type VerifiedAuthPayload } from "../utils/jwt";

// যে route-এ এটা বসবে, সেখানে login ছাড়া ঢোকা যাবে না
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) {
    throw new ApiError(401, "Authentication required");
  }

  let payload: VerifiedAuthPayload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired session");
  }

  // প্রতিবার database-এ দেখা হয় ইউজার এখনো আছে কিনা
  const user = await User.findById(payload.userId).select("name email passwordChangedAt");
  if (!user) {
    throw new ApiError(401, "Invalid or expired session");
  }

  // password বদলানোর আগে তৈরি হওয়া পুরোনো টিকিট বাতিল (সেকেন্ডে তুলনা)
  if (user.passwordChangedAt && payload.issuedAt < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new ApiError(401, "Invalid or expired session");
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: "admin" };
  next();
});
