import { Router } from "express";
import { parseJobDescription, tailorResume, generateOutreach } from "../controllers/aiController";

const router = Router();

router.post("/parse-job", parseJobDescription);
router.post("/tailor", tailorResume);
router.post("/outreach", generateOutreach);

export default router;
