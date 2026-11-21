import { Types } from "mongoose";
import { Doctor } from "../models/Doctor";
import { Patient } from "../models/Patient";
import type { DoctorInput, ListDoctorsQuery } from "../validators/doctor.validator";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { assertObjectId, dhakaDateRange } from "../utils/queryHelpers";
import { buildDoctorSearchTokens, buildSearchConditions } from "../utils/searchTokens";

const SORT_OPTIONS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
} as const;

// Doctor-এর তালিকা: search + filter + sort + pagination + প্রতি ডাক্তারের রোগী সংখ্যা
export const listDoctors = asyncHandler(async (_req, res) => {
  const { search, specialization, hospital, from, to, sort, page, limit } =
    res.locals.query as ListDoctorsQuery;

  // নিচের filter শুধু যাচাই করা মান দিয়ে বানানো (সরাসরি user-এর object নয়)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  // Search: প্রতিটা শব্দ নাম/email/hospital/specialization-এর কোনো শব্দের শুরুর সাথে মিলতে হবে (index ব্যবহার করে)
  const searchConditions = buildSearchConditions(search);
  if (searchConditions.length > 0) filter.$and = searchConditions;
  if (specialization) filter.specialization = specialization;
  if (hospital) filter.hospital = hospital;

  const createdAt = dhakaDateRange(from, to);
  if (createdAt) filter.createdAt = createdAt;

  // lean() = সাধারণ object ফেরত (দ্রুত, কম memory)
  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .sort(SORT_OPTIONS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Doctor.countDocuments(filter),
  ]);

  // এই পাতার সব ডাক্তারের রোগী সংখ্যা মাত্র ১টা aggregation query-তে (প্রতি ডাক্তারের জন্য আলাদা নয়)
  const counts =
    doctors.length > 0
      ? await Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
          { $match: { doctor: { $in: doctors.map((doctor) => doctor._id) } } },
          { $group: { _id: "$doctor", count: { $sum: 1 } } },
        ])
      : [];
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));

  const data = doctors.map((doctor) => ({
    ...doctor,
    patientCount: countMap.get(String(doctor._id)) ?? 0,
  }));

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

// Filter dropdown-এর জন্য specialization ও hospital-এর তালিকা
export const getDoctorOptions = asyncHandler(async (_req, res) => {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct("specialization") as Promise<string[]>,
    Doctor.distinct("hospital") as Promise<string[]>,
  ]);

  res.json({
    success: true,
    data: {
      specializations: specializations.sort((a, b) => a.localeCompare(b)),
      hospitals: hospitals.sort((a, b) => a.localeCompare(b)),
    },
  });
});

export const getDoctor = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const doctor = await Doctor.findById(req.params.id).lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");
  res.json({ success: true, data: doctor });
});

export const createDoctor = asyncHandler(async (req, res) => {
  const input = req.body as DoctorInput;
  const doctor = await Doctor.create({ ...input, searchTokens: buildDoctorSearchTokens(input) });
  // searchTokens শুধু ভেতরের কাজে লাগে, উত্তরে পাঠানো হয় না
  const { searchTokens: _searchTokens, ...data } = doctor.toObject();
  res.status(201).json({ success: true, data });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const input = req.body as DoctorInput;
  // তথ্য বদলালে search-তালিকাও নতুন করে বানাতে হয়, নইলে পুরোনো নামে খোঁজা যাবে
  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    { ...input, searchTokens: buildDoctorSearchTokens(input) },
    { new: true, runValidators: true }
  ).lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");
  res.json({ success: true, data: doctor });
});

// ডাক্তার মুছা: রোগী থাকলে মুছতে দেওয়া হয় না (রোগী "এতিম" হয়ে যাওয়া ঠেকাতে)
export const deleteDoctor = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);

  const hasPatients = await Patient.exists({ doctor: new Types.ObjectId(req.params.id) });
  if (hasPatients) {
    throw new ApiError(409, "This doctor still has patients. Remove or reassign the patients first.");
  }

  const deleted = await Doctor.findByIdAndDelete(req.params.id).lean();
  if (!deleted) throw new ApiError(404, "Doctor not found");
  res.json({ success: true, message: "Doctor deleted" });
});
