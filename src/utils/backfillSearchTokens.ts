import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { buildDoctorSearchTokens, buildPatientSearchTokens } from "./searchTokens";

// একসাথে কয়টা document ঠিক হবে (database-কে একসাথে বেশি চাপ না দিতে)
const BATCH_SIZE = 50;
// একবার server চালুতে সর্বোচ্চ কয়টা পুরোনো document ঠিক হবে
const MAX_PER_RUN = 5000;

// যাদের search-তালিকা নেই বা ফাঁকা, তাদের খোঁজার শর্ত
const MISSING_TOKENS = {
  $or: [{ searchTokens: { $exists: false } }, { searchTokens: { $size: 0 } }],
};

// আগে তৈরি হওয়া ডাক্তারদের search-তালিকা নেই। server চালু হলে একবার ভরে দেয়।
// সবার তালিকা থাকলে কিছুই করে না, তাই প্রতিবার চালানো নিরাপদ।
export async function backfillDoctorSearchTokens(): Promise<void> {
  const legacy = await Doctor.find(MISSING_TOKENS)
    .select("name email hospital specialization")
    .limit(MAX_PER_RUN)
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

// একই কাজ রোগীদের জন্য
export async function backfillPatientSearchTokens(): Promise<void> {
  const legacy = await Patient.find(MISSING_TOKENS).select("name phone").limit(MAX_PER_RUN).lean();

  if (legacy.length === 0) return;

  for (let start = 0; start < legacy.length; start += BATCH_SIZE) {
    const batch = legacy.slice(start, start + BATCH_SIZE);
    await Promise.all(
      batch.map((patient) =>
        Patient.updateOne({ _id: patient._id }, { $set: { searchTokens: buildPatientSearchTokens(patient) } })
      )
    );
  }

  console.log(`✅ ${legacy.length} জন রোগীর search তালিকা তৈরি হয়েছে`);
}
