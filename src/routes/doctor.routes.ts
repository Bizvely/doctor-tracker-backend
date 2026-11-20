import { Router } from "express";
import {
  createDoctor,
  getDoctor,
  getDoctorOptions,
  listDoctors,
  updateDoctor,
} from "../controllers/doctor.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { doctorSchema, listDoctorsQuerySchema } from "../validators/doctor.validator";

const router = Router();

// এই ফাইলের সব route-এ login বাধ্যতামূলক
router.use(requireAuth);

router.get("/", validateQuery(listDoctorsQuerySchema), listDoctors);
// "/meta/options" অবশ্যই "/:id"-এর আগে থাকতে হবে
router.get("/meta/options", getDoctorOptions);
router.post("/", validateBody(doctorSchema), createDoctor);
router.get("/:id", getDoctor);
router.put("/:id", validateBody(doctorSchema), updateDoctor);

export default router;
