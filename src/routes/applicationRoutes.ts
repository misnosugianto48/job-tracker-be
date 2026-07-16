import { Router } from "express";
import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../controllers/applicationController";
import { getPracticeSession, practiceChat } from "../controllers/practiceController";

const router = Router();

router.post("/", createApplication);
router.get("/", getApplications);
router.get("/:id", getApplicationById);
router.put("/:id", updateApplication);
router.patch("/:id", updateApplication);
router.delete("/:id", deleteApplication);

router.get("/:id/practice", getPracticeSession);
router.post("/:id/practice/chat", practiceChat);

export default router;
