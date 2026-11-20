import mongoose from "mongoose";
import { app } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { seedAdmin } from "./utils/seedAdmin";

async function start(): Promise<void> {
  try {
    await connectDB();
    await seedAdmin();

    // 0.0.0.0 এবং Render-এর দেওয়া PORT-এ শুনতে হয়, নইলে "Port scan timeout" আসে
    const server = app.listen(env.PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
    });

    // Render server বন্ধ করার সময় সুন্দরভাবে বন্ধ হওয়া
    const shutdown = (): void => {
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("❌ Server শুরু হয়নি:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void start();
