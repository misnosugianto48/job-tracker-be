import { Router } from "express";
import { parseJobDescription } from "../controllers/aiController";

const router = Router();

router.post("/parse-job", parseJobDescription);

export default router;
