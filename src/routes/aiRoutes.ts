import { Router } from "express";
import { parseJobDescription, tailorResume, generateOutreach, analyzeCv } from "../controllers/aiController";
import { rateLimiter } from "../lib/rateLimitMiddleware";

const router = Router();

router.post("/parse-job", parseJobDescription);
router.post("/tailor", tailorResume);
router.post("/outreach", generateOutreach);
router.post("/analyze-cv", rateLimiter(5, 60 * 1000), analyzeCv);

export default router;
