import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

export class CompanyRepository {
  async create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({ data });
  }

  async findAll() {
    return prisma.company.findMany({
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
