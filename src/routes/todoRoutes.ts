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
