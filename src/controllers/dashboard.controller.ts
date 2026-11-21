import { Types } from "mongoose";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

// "আজ" কোনটা, তা এই সময় অঞ্চল অনুযায়ী ধরা হয়
const TIMEZONE = "Asia/Dhaka";
// কত দিনের হিসাব দেখানো যাবে (শুধু এই তিনটা মান চলবে)
const ALLOWED_RANGES = [7, 30, 90] as const;
type RangeDays = (typeof ALLOWED_RANGES)[number];
const DEFAULT_RANGE: RangeDays = 30;
// "ডাক্তার-প্রতি রোগী" chart-এ সর্বোচ্চ কতজন
const TOP_DOCTORS = 10;

// ?range=7|30|90 যাচাই করা। ভুল মান এলে 400 error দেওয়া হয়।
function parseRange(value: unknown): RangeDays {
  if (value === undefined) return DEFAULT_RANGE;
  if (typeof value !== "string") throw new ApiError(400, "range must be 7, 30 or 90");
  const parsed = Number(value);
  const match = ALLOWED_RANGES.find((item) => item === parsed);
  if (match === undefined) throw new ApiError(400, "range must be 7, 30 or 90");
  return match;
}

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

export const getDashboardStats = asyncHandler(async (req, res) => {
  const range = parseRange(req.query.range);
  const today = todayInTimezone();

  // বর্তমান সময় + তার আগের সমান দৈর্ঘ্যের সময়, মোট 2×range দিনের তারিখ (পুরোনো থেকে নতুন, শেষটা আজ)
  const allDates = Array.from({ length: range * 2 }, (_, index) => addDays(today, index - (range * 2 - 1)));
  const previousDates = allDates.slice(0, range);
  const currentDates = allDates.slice(range);

  const rangeStart = new Date(`${allDates[0]}T00:00:00.000Z`);
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

    // প্রতিদিন কয়জন রোগী (বর্তমান + আগের সময় একই query-তে, visitDate index ব্যবহার করে)
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
  const countOf = (date: string): number => dayMap.get(date) ?? 0;
  const sumOf = (dates: string[]): number => dates.reduce((sum, date) => sum + countOf(date), 0);
  // এক দশমিক পর্যন্ত গড়
  const averageOf = (dates: string[]): number => Math.round((sumOf(dates) / dates.length) * 10) / 10;

  const patientsByDay = currentDates.map((date) => ({ date, count: countOf(date) }));

  res.json({
    success: true,
    data: {
      range,
      totals: { doctors: totalDoctors, patients: totalPatients },
      // প্রতিটির "current" বর্তমান মান আর "previous" তুলনার মান
      visits: {
        today: { current: countOf(today), previous: countOf(addDays(today, -1)) },
        period: { current: sumOf(currentDates), previous: sumOf(previousDates) },
        averagePerDay: { current: averageOf(currentDates), previous: averageOf(previousDates) },
      },
      patientsPerDoctor: perDoctor,
      patientsByDay,
      conditions: perCondition.map((item) => ({ condition: item._id, count: item.count })),
      timezone: TIMEZONE,
      generatedAt: new Date().toISOString(),
    },
  });
});
