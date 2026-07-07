import { Request, Response } from "express";
import { companyRepository } from "../repositories/companyRepository";
import { createCompanySchema, updateCompanySchema } from "../lib/schemas";
import { ZodError } from "zod";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0].message });
  }
  if (error.code === "P2002") {
    return res.status(400).json({ error: "A company with this name already exists." });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Company not found." });
  }
  console.error(error);
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a new company
export const createCompany = async (req: Request, res: Response) => {
  try {
    const validatedData = createCompanySchema.parse(req.body);

    const company = await companyRepository.create({
      name: validatedData.name,
      industry: validatedData.industry,
      location: validatedData.location,
      url: validatedData.url,
    });

    return res.status(201).json(company);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Get all companies
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await companyRepository.findAll();
    return res.status(200).json(companies);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Get a single company by ID
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    const company = await companyRepository.findById(id);

    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }

    return res.status(200).json(company);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Update a company
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    const validatedData = updateCompanySchema.parse(req.body);

    const company = await companyRepository.update(id, {
      ...(validatedData.name !== undefined && { name: validatedData.name }),
      ...(validatedData.industry !== undefined && { industry: validatedData.industry }),
      ...(validatedData.location !== undefined && { location: validatedData.location }),
      ...(validatedData.url !== undefined && { url: validatedData.url }),
    });

    return res.status(200).json(company);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Delete a company
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    await companyRepository.delete(id);

    return res.status(204).send();
  } catch (error) {
    return handleControllerError(error, res);
  }
};
