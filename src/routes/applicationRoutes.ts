import { Router } from "express";
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../controllers/applicationController";

const router = Router();

router.post("/", createApplication);
router.get("/", getApplications);
router.get("/:id", getApplicationById);
router.put("/:id", updateApplication);
router.patch("/:id", updateApplication);
router.delete("/:id", deleteApplication);

export default router;
