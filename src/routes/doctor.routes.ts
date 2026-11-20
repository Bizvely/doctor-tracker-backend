import { Router } from "express";
import {
  createDoctor,
  deleteDoctor,
  getDoctor,
  getDoctorOptions,
  listDoctors,
  updateDoctor,
} from "../controllers/doctor.controller";
import {
  createDoctorPatient,
  deleteDoctorPatient,
  listDoctorPatients,
} from "../controllers/patient.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { doctorSchema, listDoctorsQuerySchema } from "../validators/doctor.validator";
import { doctorPatientSchema, listDoctorPatientsQuerySchema } from "../validators/patient.validator";

const router = Router();

// এই ফাইলের সব route-এ login বাধ্যতামূলক
router.use(requireAuth);

router.get("/", validateQuery(listDoctorsQuerySchema), listDoctors);
// "/meta/options" অবশ্যই "/:id"-এর আগে থাকতে হবে
router.get("/meta/options", getDoctorOptions);
router.post("/", validateBody(doctorSchema), createDoctor);
router.get("/:id", getDoctor);
router.put("/:id", validateBody(doctorSchema), updateDoctor);
router.delete("/:id", deleteDoctor);

// একজন ডাক্তারের রোগী
router.get("/:id/patients", validateQuery(listDoctorPatientsQuerySchema), listDoctorPatients);
router.post("/:id/patients", validateBody(doctorPatientSchema), createDoctorPatient);
router.delete("/:id/patients/:patientId", deleteDoctorPatient);

export default router;
