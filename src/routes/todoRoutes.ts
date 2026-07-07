/**
 * 📚 LEARNER'S NOTE:
 * This file maps REST API endpoints for todos (checklist) to their corresponding controller actions.
 * Endpoints:
 * - POST /applications/:applicationId/todos -> Create a new todo
 * - GET /applications/:applicationId/todos -> List todos for an application
 * - PATCH /todos/:id -> Partial update (e.g. toggle completed status)
 * - DELETE /todos/:id -> Remove a todo item
 */

import { Router } from "express";
import {
  createTodo,
  getTodosByApplication,
  updateTodo,
  deleteTodo,
} from "../controllers/todoController";

const router = Router();

router.post("/applications/:applicationId/todos", createTodo);
router.get("/applications/:applicationId/todos", getTodosByApplication);
router.patch("/todos/:id", updateTodo);
router.put("/todos/:id", updateTodo);
router.delete("/todos/:id", deleteTodo);

export default router;
