import { Request, Response } from "express";
import { applicationRepository } from "../repositories/applicationRepository";
import { Stage } from "@prisma/client";

const handlePrismaError = (error: any, res: Response) => {
  console.error(error);
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a new application
export const createApplication = async (req: Request, res: Response) => {
  try {
    const { companyId, jobTitle, dateApplied, source, postingUrl, expectedSalary, stage } = req.body;

    if (!companyId || isNaN(parseInt(companyId, 10))) {
      return res.status(400).json({ error: "Valid company ID is required." });
    }
    if (!jobTitle || typeof jobTitle !== "string" || jobTitle.trim() === "") {
      return res.status(400).json({ error: "Job title is required." });
    }

    // Validate Stage enum if provided
    let appStage: Stage = Stage.WISHLIST;
    if (stage) {
      if (!Object.values(Stage).includes(stage as Stage)) {
        return res.status(400).json({ error: `Invalid stage. Must be one of: ${Object.values(Stage).join(", ")}` });
      }
      appStage = stage as Stage;
    }

    const application = await applicationRepository.create({
      companyId: parseInt(companyId, 10),
      jobTitle: jobTitle.trim(),
      dateApplied: dateApplied ? new Date(dateApplied) : null,
      source: source ? String(source).trim() : null,
      postingUrl: postingUrl ? String(postingUrl).trim() : null,
      expectedSalary: expectedSalary ? parseInt(expectedSalary, 10) : null,
      stage: appStage,
    });

    return res.status(201).json(application);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// Get all applications
export const getApplications = async (req: Request, res: Response) => {
  try {
    const stageQuery = req.query.stage as string | undefined;
    let stageFilter: Stage | undefined;

    if (stageQuery) {
      if (Object.values(Stage).includes(stageQuery as Stage)) {
        stageFilter = stageQuery as Stage;
      } else {
        return res.status(400).json({ error: "Invalid stage filter." });
      }
    }

    const applications = await applicationRepository.findAll({ stage: stageFilter });
    return res.status(200).json(applications);
  } catch (error) {
    return handlePrismaError(error, res);
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
    return handlePrismaError(error, res);
  }
};

// Update application
export const updateApplication = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const { companyId, jobTitle, dateApplied, source, postingUrl, expectedSalary, stage } = req.body;

    // Validate inputs if they are provided
    if (jobTitle !== undefined && (typeof jobTitle !== "string" || jobTitle.trim() === "")) {
      return res.status(400).json({ error: "Job title cannot be empty." });
    }

    if (stage !== undefined && !Object.values(Stage).includes(stage as Stage)) {
      return res.status(400).json({ error: "Invalid stage." });
    }

    const application = await applicationRepository.update(id, {
      ...(companyId !== undefined && { companyId: parseInt(companyId, 10) }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle.trim() }),
      ...(dateApplied !== undefined && { dateApplied: dateApplied ? new Date(dateApplied) : null }),
      ...(source !== undefined && { source: source ? String(source).trim() : null }),
      ...(postingUrl !== undefined && { postingUrl: postingUrl ? String(postingUrl).trim() : null }),
      ...(expectedSalary !== undefined && { expectedSalary: expectedSalary ? parseInt(expectedSalary, 10) : null }),
      ...(stage !== undefined && { stage: stage as Stage }),
    });

    return res.status(200).json(application);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Application not found." });
    }
    return handlePrismaError(error, res);
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
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Application not found." });
    }
    return handlePrismaError(error, res);
  }
};
