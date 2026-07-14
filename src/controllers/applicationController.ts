import { Request, Response } from "express";
import { applicationRepository } from "../repositories/applicationRepository";
import { Stage } from "@prisma/client";
import { createApplicationSchema, updateApplicationSchema } from "../lib/schemas";
import { ZodError } from "zod";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0].message });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Application not found." });
  }
  console.error(error);
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a new application
export const createApplication = async (req: Request, res: Response) => {
  try {
    const validatedData = createApplicationSchema.parse(req.body);

    const application = await applicationRepository.create({
      companyId: validatedData.companyId,
      jobTitle: validatedData.jobTitle,
      dateApplied: validatedData.dateApplied,
      source: validatedData.source,
      postingUrl: validatedData.postingUrl,
      expectedSalary: validatedData.expectedSalary,
      stage: validatedData.stage,
      resumeVersion: validatedData.resumeVersion,
    });

    return res.status(201).json(application);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Get all applications
export const getApplications = async (req: Request, res: Response) => {
  try {
    const stageQuery = req.query.stage as string | undefined;
    const searchQuery = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    let stageFilter: Stage | undefined;

    if (stageQuery) {
      if (Object.values(Stage).includes(stageQuery as Stage)) {
        stageFilter = stageQuery as Stage;
      } else {
        return res.status(400).json({ error: "Invalid stage filter." });
      }
    }

    const result = await applicationRepository.findAll({
      stage: stageFilter,
      search: searchQuery,
      page: isNaN(page as number) ? undefined : page,
      limit: isNaN(limit as number) ? undefined : limit,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Get detailed application by ID
export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const application = await applicationRepository.findById(id);
    if (!application) {
      return res.status(404).json({ error: "Application not found." });
    }

    return res.status(200).json(application);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Update application
export const updateApplication = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const validatedData = updateApplicationSchema.parse(req.body);

    const application = await applicationRepository.update(id, {
      ...(validatedData.companyId !== undefined && { companyId: validatedData.companyId }),
      ...(validatedData.jobTitle !== undefined && { jobTitle: validatedData.jobTitle }),
      ...(validatedData.dateApplied !== undefined && { dateApplied: validatedData.dateApplied }),
      ...(validatedData.source !== undefined && { source: validatedData.source }),
      ...(validatedData.postingUrl !== undefined && { postingUrl: validatedData.postingUrl }),
      ...(validatedData.expectedSalary !== undefined && { expectedSalary: validatedData.expectedSalary }),
      ...(validatedData.stage !== undefined && { stage: validatedData.stage }),
      ...(validatedData.resumeVersion !== undefined && { resumeVersion: validatedData.resumeVersion }),
    });

    return res.status(200).json(application);
  } catch (error: any) {
    return handleControllerError(error, res);
  }
};

// Delete application
export const deleteApplication = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    await applicationRepository.delete(id);
    return res.status(204).send();
  } catch (error: any) {
    return handleControllerError(error, res);
  }
};
