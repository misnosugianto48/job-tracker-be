/**
 * 📚 LEARNER'S NOTE:
 * This repository handles database interactions for the Todo model.
 * It encapsulates Prisma queries to separate database logic from controller endpoints.
 */

import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export class TodoRepository {
  async create(applicationId: number, title: string) {
    return prisma.todo.create({
      data: {
        applicationId,
        title,
      },
    });
  }

  async findAllByApplicationId(applicationId: number) {
    return prisma.todo.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: number) {
    return prisma.todo.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.TodoUpdateInput) {
    return prisma.todo.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.todo.delete({
      where: { id },
    });
  }
}

export const todoRepository = new TodoRepository();
