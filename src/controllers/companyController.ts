import { Request, Response } from "express";
import { companyRepository } from "../repositories/companyRepository";

// Helper to handle Prisma errors
const handlePrismaError = (error: any, res: Response) => {
  console.error(error);
  if (error.code === "P2002") {
    return res.status(400).json({ error: "A company with this name already exists." });
  }
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a new company
export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, industry, location, url } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Company name is required." });
    }

    const company = await companyRepository.create({
      name: name.trim(),
      industry: industry ? String(industry).trim() : null,
      location: location ? String(location).trim() : null,
      url: url ? String(url).trim() : null,
    });

    return res.status(201).json(company);
  } catch (error) {
    return handlePrismaError(error, res);
  }
};

// Get all companies
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await companyRepository.findAll();
    return res.status(200).json(companies);
  } catch (error) {
    return handlePrismaError(error, res);
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
    return handlePrismaError(error, res);
  }
};

// Update a company
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    const { name, industry, location, url } = req.body;

    // Check if updating name and it is empty
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ error: "Company name cannot be empty." });
    }

    const company = await companyRepository.update(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(industry !== undefined && { industry: industry ? String(industry).trim() : null }),
      ...(location !== undefined && { location: location ? String(location).trim() : null }),
      ...(url !== undefined && { url: url ? String(url).trim() : null }),
    });

    return res.status(200).json(company);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Company not found." });
    }
    return handlePrismaError(error, res);
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
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Company not found." });
    }
    return handlePrismaError(error, res);
  }
};
