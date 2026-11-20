import mongoose from "mongoose";
import { env } from "./env";

// MongoDB-র সাথে সংযোগ। ১০ সেকেন্ডে না পারলে error দিয়ে থেমে যাবে।
export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("✅ MongoDB connected");
}
