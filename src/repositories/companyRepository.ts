import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export class CompanyRepository {
  async create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({ data });
  }

  async findAll(filters?: { search?: string; page?: number; limit?: number }) {
    const where = {
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { industry: { contains: filters.search, mode: "insensitive" as const } },
          { location: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
    };

    if (filters?.page !== undefined && filters?.limit !== undefined) {
      const skip = (filters.page - 1) * filters.limit;
      const take = filters.limit;

      const [data, total] = await Promise.all([
        prisma.company.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take,
        }),
        prisma.company.count({ where }),
      ]);

      return { data, total };
    }

    return prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  async findById(id: number) {
    return prisma.company.findUnique({
      where: { id },
      include: {
        applications: true,
      },
    });
  }

  async update(id: number, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.company.delete({
      where: { id },
    });
  }
}

export const companyRepository = new CompanyRepository();
