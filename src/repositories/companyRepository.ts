import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export class CompanyRepository {
  async create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({ data });
  }

  async findAll(filters?: { search?: string }) {
    return prisma.company.findMany({
      where: {
        ...(filters?.search && {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { industry: { contains: filters.search, mode: "insensitive" } },
            { location: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
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
