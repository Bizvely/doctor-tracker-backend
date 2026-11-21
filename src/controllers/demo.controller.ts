import { Doctor } from "../models/Doctor";
import { PATIENT_CONDITIONS, Patient } from "../models/Patient";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { buildDoctorSearchTokens, buildPatientSearchTokens } from "../utils/searchTokens";

type Condition = (typeof PATIENT_CONDITIONS)[number];

interface DemoDoctor {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  // বেশি weight = বেশি রোগী (chart-এ বৈচিত্র্য আনতে)
  weight: number;
  // এই ডাক্তারের রোগীদের সাধারণ রোগ
  conditions: Condition[];
}

// আন্তর্জাতিক নামের demo ডাক্তার (email-এ example.com: এটা সংরক্ষিত ডোমেইন, সত্যিকারের কারো নয়)
export const DEMO_DOCTORS: DemoDoctor[] = [
  { name: "Dr. Sarah Johnson", specialization: "Cardiology", hospital: "City General Hospital", phone: "+15550102001", email: "sarah.johnson@example.com", weight: 10, conditions: ["Hypertension", "Heart Disease"] },
  { name: "Dr. Rahul Mehta", specialization: "Endocrinology", hospital: "Riverside Medical Center", phone: "+15550102002", email: "rahul.mehta@example.com", weight: 9, conditions: ["Diabetes"] },
  { name: "Dr. Amira Hassan", specialization: "Pulmonology", hospital: "City General Hospital", phone: "+15550102003", email: "amira.hassan@example.com", weight: 7, conditions: ["Asthma", "Infection"] },
  { name: "Dr. Daniel Kim", specialization: "Neurology", hospital: "Lakeside Clinic", phone: "+15550102004", email: "daniel.kim@example.com", weight: 6, conditions: ["Migraine"] },
  { name: "Dr. Elena Rossi", specialization: "Rheumatology", hospital: "Riverside Medical Center", phone: "+15550102005", email: "elena.rossi@example.com", weight: 5, conditions: ["Arthritis"] },
  { name: "Dr. Michael Brown", specialization: "Internal Medicine", hospital: "Lakeside Clinic", phone: "+15550102006", email: "michael.brown@example.com", weight: 5, conditions: ["Fever", "Infection", "Hypertension", "Other"] },
  { name: "Dr. Priya Nair", specialization: "Allergy & Immunology", hospital: "Sunrise Health Center", phone: "+15550102007", email: "priya.nair@example.com", weight: 4, conditions: ["Allergy", "Asthma"] },
  { name: "Dr. James Wilson", specialization: "Orthopedics", hospital: "Sunrise Health Center", phone: "+15550102008", email: "james.wilson@example.com", weight: 3, conditions: ["Injury", "Arthritis"] },
];

const FIRST_NAMES = [
  "Olivia", "Liam", "Sofia", "Noah", "Aisha", "Lucas", "Mei", "Ethan", "Fatima", "Mateo", "Emma", "Arjun",
  "Isabella", "Omar", "Hannah", "Diego", "Zara", "Leo", "Nadia", "Oliver", "Yuki", "Samuel", "Chloe", "Ravi",
];
const LAST_NAMES = [
  "Smith", "Garcia", "Chen", "Khan", "Müller", "Silva", "Patel", "Nguyen", "Cohen", "Lopez",
  "Anderson", "Ivanov", "Okafor", "Tanaka", "Moreau", "Haddad", "Singh", "Bianchi", "Kowalski", "Reyes",
];
const NOTES = [
  "Follow-up visit in two weeks.",
  "Prescribed medication, review after one month.",
  "Advised rest and plenty of fluids.",
  "Blood test results pending.",
  "Referred for an additional scan.",
  "Symptoms improving since last visit.",
  "Lifestyle and diet changes discussed.",
  "Allergic to penicillin.",
];

const PATIENT_COUNT = 52;
const DAY_MS = 24 * 60 * 60 * 1000;

// সবসময় একই ফল দেওয়া random (seed ঠিক থাকলে প্রতিবার একই demo data)
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// weight অনুযায়ী একটা index বাছা
function pickWeighted(weights: number[], random: () => number): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    target -= weights[index];
    if (target < 0) return index;
  }
  return weights.length - 1;
}

// আজকের তারিখ (Asia/Dhaka, UTC+6), "YYYY-MM-DD"
function dhakaToday(): string {
  return new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Demo data শুধু ফাঁকা database-এ: কিছু থাকলে আসল data নষ্ট না করে 409 দেয়
export const loadDemoData = asyncHandler(async (_req, res) => {
  const [hasDoctors, hasPatients] = await Promise.all([Doctor.exists({}), Patient.exists({})]);
  if (hasDoctors || hasPatients) {
    throw new ApiError(409, "Demo data can only be loaded into an empty database.");
  }

  const doctors = await Doctor.insertMany(
    DEMO_DOCTORS.map(({ name, specialization, hospital, phone, email }) => ({
      name,
      specialization,
      hospital,
      phone,
      email,
      searchTokens: buildDoctorSearchTokens({ name, specialization, hospital, email }),
    }))
  );

  try {
    const random = createRandom(20261121);
    const weights = DEMO_DOCTORS.map((doctor) => doctor.weight);
    const todayMidnight = new Date(`${dhakaToday()}T00:00:00.000Z`).getTime();

    const patients = Array.from({ length: PATIENT_COUNT }, (_, index) => {
      const doctorIndex = pickWeighted(weights, random);
      const demoDoctor = DEMO_DOCTORS[doctorIndex];

      // ৮০% রোগী ডাক্তারের বিশেষত্বের রোগ নিয়ে আসে, বাকিরা যেকোনো রোগ
      const pool: readonly Condition[] = random() < 0.8 ? demoDoctor.conditions : PATIENT_CONDITIONS;
      const condition = pool[Math.floor(random() * pool.length)];

      const genderRoll = random();
      const gender = genderRoll < 0.47 ? "male" : genderRoll < 0.94 ? "female" : "other";

      // সাম্প্রতিক দিনে বেশি visit (০ থেকে ২৯ দিন আগে)
      const daysAgo = Math.floor(Math.pow(random(), 1.3) * 30);

      const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[(index * 7 + 3) % LAST_NAMES.length]}`;
      const phone = `+1555010${String(3000 + index)}`;

      return {
        name,
        age: 3 + Math.floor(random() * 83),
        gender,
        phone,
        condition,
        notes: random() < 0.5 ? NOTES[Math.floor(random() * NOTES.length)] : undefined,
        visitDate: new Date(todayMidnight - daysAgo * DAY_MS),
        doctor: doctors[doctorIndex]._id,
        searchTokens: buildPatientSearchTokens({ name, phone }),
      };
    });

    await Patient.insertMany(patients);

    res.status(201).json({
      success: true,
      message: "Demo data loaded",
      data: { doctors: doctors.length, patients: patients.length },
    });
  } catch (error) {
    // রোগী তৈরি ব্যর্থ হলে ডাক্তারগুলোও মুছে ফেলা, যাতে অর্ধেক data পড়ে না থাকে
    await Doctor.deleteMany({ _id: { $in: doctors.map((doctor) => doctor._id) } });
    throw error;
  }
});

// ---------- Demo data on/off (Settings পাতার জন্য) ----------

// demo ডাক্তারদের email তালিকা (এই email-গুলো দিয়েই demo ডাক্তার চেনা যায়)
const DEMO_EMAILS = DEMO_DOCTORS.map((doctor) => doctor.email);
// demo রোগীর phone সবসময় +1555010 দিয়ে শুরু, মোট ১১ অঙ্ক (আসল রোগীদের সাথে গুলিয়ে না যাওয়ার জন্য)
const DEMO_PATIENT_PHONE = /^\+1555010\d{4}$/;

// এখন demo data আছে কিনা, আর নতুন করে লোড করা যাবে কিনা
export const getDemoStatus = asyncHandler(async (_req, res) => {
  const demoDoctors = await Doctor.find({ email: { $in: DEMO_EMAILS } })
    .select("_id")
    .lean();
  const demoDoctorIds = demoDoctors.map((doctor) => doctor._id);

  const [demoPatients, totalDoctors, totalPatients] = await Promise.all([
    demoDoctorIds.length > 0
      ? Patient.countDocuments({ doctor: { $in: demoDoctorIds }, phone: DEMO_PATIENT_PHONE })
      : 0,
    Doctor.estimatedDocumentCount(),
    Patient.estimatedDocumentCount(),
  ]);

  res.json({
    success: true,
    data: {
      loaded: demoDoctors.length > 0,
      demoDoctors: demoDoctors.length,
      demoPatients,
      // নতুন করে লোড করা যায় শুধু database সম্পূর্ণ ফাঁকা থাকলে
      canLoad: totalDoctors === 0 && totalPatients === 0,
    },
  });
});

// শুধু demo ডাক্তার ও demo রোগী মোছা। আপনার নিজের যোগ করা ডাক্তার/রোগীতে হাত পড়ে না।
export const removeDemoData = asyncHandler(async (_req, res) => {
  const demoDoctors = await Doctor.find({ email: { $in: DEMO_EMAILS } })
    .select("_id")
    .lean();
  if (demoDoctors.length === 0) {
    throw new ApiError(409, "No demo data found to remove.");
  }
  const demoDoctorIds = demoDoctors.map((doctor) => doctor._id);

  // আগে demo রোগী মোছা (phone মিললে তবেই)
  const patientResult = await Patient.deleteMany({
    doctor: { $in: demoDoctorIds },
    phone: DEMO_PATIENT_PHONE,
  });

  // যে demo ডাক্তারের নিজের যোগ করা আসল রোগী রয়ে গেছে, সেই ডাক্তারকে মোছা হয় না (রোগী এতিম হতো)
  const keptDoctorIds = await Patient.distinct("doctor", { doctor: { $in: demoDoctorIds } });
  const keptSet = new Set(keptDoctorIds.map((id) => String(id)));
  const removableIds = demoDoctorIds.filter((id) => !keptSet.has(String(id)));

  const doctorResult = await Doctor.deleteMany({ _id: { $in: removableIds } });

  res.json({
    success: true,
    message: "Demo data removed",
    data: {
      doctors: doctorResult.deletedCount,
      patients: patientResult.deletedCount,
      keptDoctors: demoDoctorIds.length - removableIds.length,
    },
  });
});
