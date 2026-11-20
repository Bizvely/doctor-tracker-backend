import { Types } from "mongoose";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { asyncHandler } from "../utils/asyncHandler";

// "আজ" কোনটা, তা এই সময় অঞ্চল অনুযায়ী ধরা হয়
const TIMEZONE = "Asia/Dhaka";
// chart-এ কত দিন দেখানো হবে
const DAYS = 30;
// "ডাক্তার-প্রতি রোগী" chart-এ সর্বোচ্চ কতজন
const TOP_DOCTORS = 10;

// নির্দিষ্ট সময় অঞ্চলে আজকের তারিখ "YYYY-MM-DD" আকারে (en-CA এই আকারই দেয়)
function todayInTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// "YYYY-MM-DD" তারিখে দিন যোগ/বিয়োগ (UTC ধরে, তাই সময় অঞ্চলের গোলমাল নেই)
function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const getDashboardStats = asyncHandler(async (_req, res) => {
  const today = todayInTimezone();
  // গত ৩০ দিনের তারিখের তালিকা (পুরোনো থেকে নতুন, শেষটা আজ)
  const dates = Array.from({ length: DAYS }, (_, index) => addDays(today, index - (DAYS - 1)));
  const rangeStart = new Date(`${dates[0]}T00:00:00.000Z`);
  const rangeEnd = new Date(`${today}T00:00:00.000Z`);

  // ৫টা query একসাথে চলে (একটার জন্য আরেকটার অপেক্ষা নেই)
  const [totalDoctors, totalPatients, perDoctor, perDay, perCondition] = await Promise.all([
    // estimatedDocumentCount: পুরো collection না গুনে metadata থেকে সংখ্যা দেয় (খুব দ্রুত)
    Doctor.estimatedDocumentCount(),
    Patient.estimatedDocumentCount(),

    // ডাক্তার-প্রতি রোগী: আগে গুনে সেরা ১০ বাছা হয়, তারপর শুধু ওই ১০ জনের নাম আনা হয়
    Patient.aggregate<{
      doctorId: Types.ObjectId;
      name: string;
      specialization: string;
      count: number;
    }>([
      { $group: { _id: "$doctor", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: TOP_DOCTORS },
      { $lookup: { from: Doctor.collection.name, localField: "_id", foreignField: "_id", as: "doctor" } },
      { $unwind: "$doctor" },
      {
        $project: {
          _id: 0,
          doctorId: "$_id",
          name: "$doctor.name",
          specialization: "$doctor.specialization",
          count: 1,
        },
      },
    ]),

    // প্রতিদিন কয়জন রোগী (শুধু গত ৩০ দিনের, visitDate index ব্যবহার করে)
    Patient.aggregate<{ _id: string; count: number }>([
      { $match: { visitDate: { $gte: rangeStart, $lte: rangeEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$visitDate", timezone: "UTC" } },
          count: { $sum: 1 },
        },
      },
    ]),

    // রোগ অনুযায়ী বণ্টন
    Patient.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$condition", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
  ]);

  // যেসব দিনে রোগী নেই সেগুলোতে ০ বসানো, যাতে chart-এ ফাঁক না থাকে
  const dayMap = new Map(perDay.map((item) => [item._id, item.count]));
  const patientsByDay = dates.map((date) => ({ date, count: dayMap.get(date) ?? 0 }));

  // শেষ n দিনের যোগফল (বাড়তি query ছাড়াই)
  const sumLast = (days: number): number =>
    patientsByDay.slice(-days).reduce((sum, item) => sum + item.count, 0);

  res.json({
    success: true,
    data: {
      totals: { doctors: totalDoctors, patients: totalPatients },
      visits: {
        today: sumLast(1),
        last7Days: sumLast(7),
        last30Days: sumLast(30),
      },
      patientsPerDoctor: perDoctor,
      patientsByDay,
      conditions: perCondition.map((item) => ({ condition: item._id, count: item.count })),
      timezone: TIMEZONE,
      generatedAt: new Date().toISOString(),
    },
  });
});
