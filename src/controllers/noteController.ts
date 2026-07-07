import { Request, Response } from "express";
import { noteRepository } from "../repositories/noteRepository";
import { createNoteSchema, updateNoteSchema } from "../lib/schemas";
import { ZodError } from "zod";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0].message });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Note not found." });
  }
  console.error(error);
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a new note
export const createNote = async (req: Request, res: Response) => {
  try {
    const validatedData = createNoteSchema.parse(req.body);

    const note = await noteRepository.create({
      applicationId: validatedData.applicationId,
      title: validatedData.title,
      content: validatedData.content,
      type: validatedData.type,
      eventDate: validatedData.eventDate,
    });

    return res.status(201).json(note);
  } catch (error) {
    return handleControllerError(error, res);
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
    return handleControllerError(error, res);
  }
};

// Update note
export const updateNote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid note ID." });
    }

    const validatedData = updateNoteSchema.parse(req.body);

    const note = await noteRepository.update(id, {
      ...(validatedData.title !== undefined && { title: validatedData.title }),
      ...(validatedData.content !== undefined && { content: validatedData.content }),
      ...(validatedData.type !== undefined && { type: validatedData.type }),
      ...(validatedData.eventDate !== undefined && { eventDate: validatedData.eventDate }),
    });

    return res.status(200).json(note);
  } catch (error: any) {
    return handleControllerError(error, res);
  }
};

// Delete note
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid note ID." });
    }

    await noteRepository.delete(id);

    return res.status(204).send();
  } catch (error: any) {
    return handleControllerError(error, res);
  }
};
