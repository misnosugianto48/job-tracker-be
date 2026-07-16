/**
 * 📚 LEARNER'S NOTE:
 * This file contains the Zod validation schemas for all key models (Company, Application, Todo, Note).
 * It unifies input sanitization and verification on the backend to prevent prototype pollution and database mismatches.
 */

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
  todos: z.array(z.string()).optional(),
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

// Contact Schemas
export const createContactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required"),
  role: z.string().trim().nullable().optional(),
  email: z.preprocess(
    (arg) => (arg === "" || arg === undefined ? null : arg),
    z.string().trim().email("Invalid email address").nullable().optional()
  ),
  phone: z.string().trim().nullable().optional(),
  linkedInUrl: z.preprocess(
    (arg) => (arg === "" || arg === undefined ? null : arg),
    z.string().trim().url("Invalid URL").nullable().optional()
  ),
  notes: z.string().trim().nullable().optional(),
});

export const updateContactSchema = createContactSchema.partial();

// AI Schemas
export const parseJobSchema = z.object({
  description: z.string().trim().min(1, "Job description cannot be empty"),
});

export const tailorSchema = z.object({
  jobDescription: z.string().trim().min(1, "Job description cannot be empty"),
  resumeText: z.string().trim().min(1, "Resume text cannot be empty"),
});

export const practiceChatSchema = z.object({
  message: z.string().trim().min(1, "message is required and cannot be empty"),
});

