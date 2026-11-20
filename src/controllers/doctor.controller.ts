import { Doctor } from "../models/Doctor";
import type { DoctorInput, ListDoctorsQuery } from "../validators/doctor.validator";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { assertObjectId, dhakaDateRange, escapeRegex } from "../utils/queryHelpers";

const SORT_OPTIONS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
} as const;

// Doctor-এর তালিকা: search + filter + sort + pagination
export const listDoctors = asyncHandler(async (_req, res) => {
  const { search, specialization, hospital, from, to, sort, page, limit } =
    res.locals.query as ListDoctorsQuery;

  // নিচের filter শুধু যাচাই করা মান দিয়ে বানানো (সরাসরি user-এর object নয়)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { hospital: pattern }, { specialization: pattern }];
  }
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

  res.json({
    success: true,
    data: doctors,
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
  const doctor = await Doctor.create(req.body as DoctorInput);
  res.status(201).json({ success: true, data: doctor });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body as DoctorInput, {
    new: true,
    runValidators: true,
  }).lean();
  if (!doctor) throw new ApiError(404, "Doctor not found");
  res.json({ success: true, data: doctor });
});
