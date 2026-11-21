import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requireAllowedOrigin } from "./middleware/originCheck";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import doctorRoutes from "./routes/doctor.routes";
import patientRoutes from "./routes/patient.routes";
import { ApiError } from "./utils/ApiError";

export const app = express();

// "Express" পরিচয় লুকানো, যাতে আক্রমণকারী সহজে বুঝতে না পারে
app.disable("x-powered-by");

// Render proxy-র পেছনে চলে, তাই আসল user-এর IP পেতে এটা দরকার (rate limit-এর জন্য)
app.set("trust proxy", 1);

// নিরাপত্তামূলক HTTP header (helmet)
app.use(helmet());

// CORS: শুধু আমাদের Frontend-কে অনুমতি দেওয়া হয়
app.use(
  cors({
    origin: (origin, callback) => {
      // origin না থাকলে (যেমন health check, curl) অনুমতি; browser-এর জন্য তালিকা মিলতে হবে
      if (!origin || env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new ApiError(403, "Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Health check: rate limit-এর আগে রাখা, কারণ Render বারবার এটা দেখে
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
  });
});

// সব API-র জন্য সাধারণ rate limit: প্রতি IP থেকে ১৫ মিনিটে সর্বোচ্চ ৩০০ request
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
  })
);

// Body ছোট রাখা (১০KB), যাতে কেউ বিশাল data পাঠিয়ে server আটকাতে না পারে
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ success: true, message: "Doctor Tracker API" });
});

// রোগী ও ডাক্তারের তথ্য browser বা মাঝের কোনো cache-এ জমা হতে দেওয়া হয় না (no-store)
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// ডাটা বদলানো সব API-তে origin যাচাই (CSRF প্রতিরক্ষা)
app.use("/api", requireAllowedOrigin);

app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
