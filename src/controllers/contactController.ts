import { Request, Response } from "express";
import { contactRepository } from "../repositories/contactRepository";
import { createContactSchema, updateContactSchema } from "../lib/schemas";
import { ZodError } from "zod";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0].message });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Contact not found." });
  }
  console.error(error);
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a new contact
export const createContact = async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId as string, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    const validatedData = createContactSchema.parse(req.body);

    const contact = await contactRepository.create({
      companyId,
      name: validatedData.name,
      role: validatedData.role,
      email: validatedData.email,
      phone: validatedData.phone,
      linkedInUrl: validatedData.linkedInUrl,
      notes: validatedData.notes,
    });

    return res.status(201).json(contact);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Get all contacts for a company
export const getContactsByCompany = async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId as string, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID." });
    }

    const contacts = await contactRepository.findAllByCompanyId(companyId);
    return res.status(200).json(contacts);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Update a contact
export const updateContact = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid contact ID." });
    }

    const validatedData = updateContactSchema.parse(req.body);

    const contact = await contactRepository.update(id, {
      ...(validatedData.name !== undefined && { name: validatedData.name }),
      ...(validatedData.role !== undefined && { role: validatedData.role }),
      ...(validatedData.email !== undefined && { email: validatedData.email }),
      ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
      ...(validatedData.linkedInUrl !== undefined && { linkedInUrl: validatedData.linkedInUrl }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
    });

    return res.status(200).json(contact);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Delete a contact
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid contact ID." });
    }

    await contactRepository.delete(id);
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(error, res);
  }
};
