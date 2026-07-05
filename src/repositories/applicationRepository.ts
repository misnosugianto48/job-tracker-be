import { Prisma, Stage } from "@prisma/client";
import prisma from "../lib/prisma";

export class ApplicationRepository {
  async create(data: Prisma.ApplicationUncheckedCreateInput) {
    return prisma.application.create({
      data,
      include: {
        company: true,
      },
    });
  }

  async findAll(filters?: { stage?: Stage }) {
    return prisma.application.findMany({
      where: {
        ...(filters?.stage && { stage: filters.stage }),
      },
      include: {
        company: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async findById(id: number) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        company: true,
        notes: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async update(id: number, data: Prisma.ApplicationUncheckedUpdateInput) {
    return prisma.application.update({
      where: { id },
      data,
      include: {
        company: true,
      },
    });
  }

  async delete(id: number) {
    return prisma.application.delete({
      where: { id },
    });
  }
}

export const applicationRepository = new ApplicationRepository();
