/**
 * 📚 LEARNER'S NOTE:
 * This controller processes client requests for the Todo sub-tasks checklist.
 * It parses URL parameters, invokes the Zod schema parsing, delegates DB calls to the repository, and responds with standardized JSON.
 */

import { Request, Response } from "express";
import { todoRepository } from "../repositories/todoRepository";
import { createTodoSchema, updateTodoSchema } from "../lib/schemas";
import { ZodError } from "zod";
import logger from "../lib/logger";

const handleControllerError = (error: any, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.issues[0].message });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Todo not found." });
  }
  logger.error("Todo controller error:", error);
  return res.status(500).json({ error: "An unexpected database error occurred." });
};

// Create a todo under an application
export const createTodo = async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.applicationId as string, 10);
    if (isNaN(applicationId)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const { title } = createTodoSchema.parse(req.body);

    const todo = await todoRepository.create(applicationId, title);
    return res.status(201).json(todo);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Get todos for an application
export const getTodosByApplication = async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.applicationId as string, 10);
    if (isNaN(applicationId)) {
      return res.status(400).json({ error: "Invalid application ID." });
    }

    const todos = await todoRepository.findAllByApplicationId(applicationId);
    return res.status(200).json(todos);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Update todo
export const updateTodo = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid todo ID." });
    }

    const updates = updateTodoSchema.parse(req.body);

    const todo = await todoRepository.update(id, updates);
    return res.status(200).json(todo);
  } catch (error) {
    return handleControllerError(error, res);
  }
};

// Delete todo
export const deleteTodo = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid todo ID." });
    }

    await todoRepository.delete(id);
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(error, res);
  }
};
