import { z } from "zod";
import { Stage, NoteType } from "@prisma/client";

// Stage enum validator
export const stageSchema = z.nativeEnum(Stage);

// NoteType enum validator
export const noteTypeSchema = z.nativeEnum(NoteType);

// Company Schemas
export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  industry: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  url: z.string().trim().nullable().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// Application Schemas
export const createApplicationSchema = z.object({
  companyId: z.preprocess(
    (arg) => (arg === "" || arg === null || arg === undefined ? undefined : Number(arg)),
    z.number().int("Company ID must be an integer")
  ),
  jobTitle: z.string().trim().min(1, "Job title cannot be empty"),
  dateApplied: z.preprocess((arg) => {
    if (typeof arg === "string" && arg.trim() !== "") return new Date(arg);
    return arg;
  }, z.date().nullable().optional()),
  source: z.string().trim().nullable().optional(),
  postingUrl: z.string().trim().nullable().optional(),
  expectedSalary: z.preprocess((arg) => {
    if (arg === "" || arg === null || arg === undefined) return undefined;
    return Number(arg);
  }, z.number().int().nonnegative().nullable().optional()),
  stage: stageSchema.default(Stage.WISHLIST),
  resumeVersion: z.string().trim().nullable().optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial().omit({
  companyId: true,
}).extend({
  companyId: z.preprocess(
    (arg) => (arg === "" || arg === null || arg === undefined ? undefined : Number(arg)),
    z.number().int().optional()
  ),
});

// Todo Schemas
export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty"),
});

export const updateTodoSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").optional(),
  completed: z.boolean().optional(),
});

// Note Schemas
export const createNoteSchema = z.object({
  applicationId: z.preprocess(
    (arg) => (arg === "" || arg === null || arg === undefined ? undefined : Number(arg)),
    z.number().int("Application ID must be an integer")
  ),
  title: z.string().trim().min(1, "Note title is required"),
  content: z.string().trim().min(1, "Note content is required"),
  type: noteTypeSchema.default(NoteType.GENERAL),
  eventDate: z.preprocess((arg) => {
    if (typeof arg === "string" && arg.trim() !== "") return new Date(arg);
    return arg;
  }, z.date().nullable().optional()),
});

export const updateNoteSchema = createNoteSchema.partial().omit({
  applicationId: true,
}).extend({
  applicationId: z.preprocess(
    (arg) => (arg === "" || arg === null || arg === undefined ? undefined : Number(arg)),
    z.number().int().optional()
  ),
});
