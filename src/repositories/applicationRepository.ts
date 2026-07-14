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

  async findAll(filters?: { stage?: Stage; search?: string; page?: number; limit?: number }) {
    const where = {
      ...(filters?.stage && { stage: filters.stage }),
      ...(filters?.search && {
        OR: [
          { jobTitle: { contains: filters.search, mode: "insensitive" as const } },
          { company: { name: { contains: filters.search, mode: "insensitive" as const } } },
        ],
      }),
    };

    if (filters?.page !== undefined && filters?.limit !== undefined) {
      const skip = (filters.page - 1) * filters.limit;
      const take = filters.limit;

      const [data, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            company: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
          skip,
          take,
        }),
        prisma.application.count({ where }),
      ]);

      return { data, total };
    }

    return prisma.application.findMany({
      where,
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
        todos: {
          orderBy: {
            createdAt: "asc",
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
