import { Schema, model } from "mongoose";

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    specialization: { type: String, required: true, trim: true, maxlength: 80 },
    hospital: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    // unique: true মানে একই email দুইবার থাকতে পারবে না (index নিজে তৈরি হয়)
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  },
  { timestamps: true, versionKey: false }
);

// Index: search, filter, sort দ্রুত করার জন্য (database পুরো তালিকা না ঘেঁটে সরাসরি খুঁজে পায়)
doctorSchema.index({ name: 1 });
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1 });
doctorSchema.index({ createdAt: -1 });

export const Doctor = model("Doctor", doctorSchema);
