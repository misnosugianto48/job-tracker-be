import { Router } from "express";
import { parseJobDescription, tailorResume } from "../controllers/aiController";

const router = Router();

router.post("/parse-job", parseJobDescription);
router.post("/tailor", tailorResume);

export default router;
