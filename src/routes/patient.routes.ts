import { Router } from "express";
import {
  createPatient,
  deletePatient,
  getPatient,
  getPatientOptions,
  listPatients,
  updatePatient,
} from "../controllers/patient.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { listPatientsQuerySchema, patientSchema } from "../validators/patient.validator";

const router = Router();

// এই ফাইলের সব route-এ login বাধ্যতামূলক
router.use(requireAuth);

router.get("/", validateQuery(listPatientsQuerySchema), listPatients);
// "/meta/options" অবশ্যই "/:id"-এর আগে থাকতে হবে
router.get("/meta/options", getPatientOptions);
router.post("/", validateBody(patientSchema), createPatient);
router.get("/:id", getPatient);
router.put("/:id", validateBody(patientSchema), updatePatient);
router.delete("/:id", deletePatient);

export default router;
