import type { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const AUTH_COOKIE_NAME = "dt_token";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface AuthPayload {
  userId: string;
  role: "admin";
}

// টিকিট (token) তৈরি: ১ দিন বৈধ
export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "1d", algorithm: "HS256" });
}

// টিকিট যাচাই: ভুল বা মেয়াদোত্তীর্ণ হলে error ছোড়ে
export function verifyAuthToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string" || typeof decoded.userId !== "string" || decoded.role !== "admin") {
    throw new Error("Invalid token payload");
  }
  return { userId: decoded.userId, role: "admin" };
}

// Cookie-র নিরাপত্তা সেটিং: JavaScript পড়তে পারবে না, production-এ শুধু HTTPS
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.COOKIE_SAMESITE,
    maxAge: ONE_DAY_MS,
    path: "/",
  };
}
