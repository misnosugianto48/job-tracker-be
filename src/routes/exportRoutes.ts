import { Router } from "express";
import { exportData } from "../controllers/exportController";

const router = Router();

router.get("/", exportData);

export default router;
