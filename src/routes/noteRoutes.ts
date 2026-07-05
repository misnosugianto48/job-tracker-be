import { Router } from "express";
import {
  createNote,
  getNotesForApplication,
  updateNote,
  deleteNote,
} from "../controllers/noteController.js";

const router = Router();

router.post("/", createNote);
router.get("/", getNotesForApplication);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;
