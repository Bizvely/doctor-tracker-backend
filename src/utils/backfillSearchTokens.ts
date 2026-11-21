import { Doctor } from "../models/Doctor";
import { buildDoctorSearchTokens } from "./searchTokens";

// একসাথে কয়টা ডাক্তার ঠিক হবে (database-কে একসাথে বেশি চাপ না দিতে)
const BATCH_SIZE = 50;

// আগে তৈরি হওয়া ডাক্তারদের search-তালিকা নেই। server চালু হলে একবার ভরে দেয়।
// সবার তালিকা থাকলে কিছুই করে না, তাই প্রতিবার চালানো নিরাপদ।
export async function backfillDoctorSearchTokens(): Promise<void> {
  const legacy = await Doctor.find({
    $or: [{ searchTokens: { $exists: false } }, { searchTokens: { $size: 0 } }],
  })
    .select("name email hospital specialization")
    .limit(5000)
    .lean();

  if (legacy.length === 0) return;

  for (let start = 0; start < legacy.length; start += BATCH_SIZE) {
    const batch = legacy.slice(start, start + BATCH_SIZE);
    await Promise.all(
      batch.map((doctor) =>
        Doctor.updateOne({ _id: doctor._id }, { $set: { searchTokens: buildDoctorSearchTokens(doctor) } })
      )
    );
  }

  console.log(`✅ ${legacy.length} জন ডাক্তারের search তালিকা তৈরি হয়েছে`);
}
