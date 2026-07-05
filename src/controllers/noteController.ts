import { Request, Response } from "express";
import { noteRepository } from "../repositories/noteRepository";
import { NoteType } from "@prisma/client";

const handlePrismaError = (error: any, res: Response) => {
  console.error(error);
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a new note
export const createNote = async (req: Request, res: Response) => {
  try {
    const { applicationId, title, content, type, eventDate } = req.body;

    if (!applicationId || isNaN(parseInt(applicationId, 10))) {
      return res.status(400).json({ error: "Valid application ID is required." });
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ error: "Note title is required." });
    }
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ error: "Note content is required." });
    }

    // Validate NoteType enum if provided
    let noteType: NoteType = NoteType.GENERAL;
    if (type) {
      if (!Object.values(NoteType).includes(type as NoteType)) {
        return res.status(400).json({ error: `Invalid note type. Must be one of: ${Object.values(NoteType).join(", ")}` });
      }
      noteType = type as NoteType;
    }

    const note = await noteRepository.create({
      applicationId: parseInt(applicationId, 10),
      title: title.trim(),
      content: content.trim(),
      type: noteType,
      eventDate: eventDate ? new Date(eventDate) : null,
    });

    return res.status(201).json(note);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// Get all notes for a specific application
export const getNotesForApplication = async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.query.applicationId as string, 10);
    if (isNaN(applicationId)) {
      return res.status(400).json({ error: "Invalid or missing applicationId query parameter." });
    }

    const notes = await noteRepository.findAllForApplication(applicationId);
    return res.status(200).json(notes);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// Update note
export const updateNote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid note ID." });
    }

    const { title, content, type, eventDate } = req.body;

    if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
      return res.status(400).json({ error: "Note title cannot be empty." });
    }
    if (content !== undefined && (typeof content !== "string" || content.trim() === "")) {
      return res.status(400).json({ error: "Note content cannot be empty." });
    }
    if (type !== undefined && !Object.values(NoteType).includes(type as NoteType)) {
      return res.status(400).json({ error: "Invalid note type." });
    }

    const note = await noteRepository.update(id, {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(type !== undefined && { type: type as NoteType }),
      ...(eventDate !== undefined && { eventDate: eventDate ? new Date(eventDate) : null }),
    });

    return res.status(200).json(note);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Note not found." });
    }
    return handlePrismaError(error, res);
  }
};

// Delete note
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid note ID." });
    }

    const note = await noteRepository.delete(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    return res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Note not found." });
    }
    return handlePrismaError(error, res);
  }
};
