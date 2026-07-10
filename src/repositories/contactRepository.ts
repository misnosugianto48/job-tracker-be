import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export class ContactRepository {
  async create(data: Prisma.ContactUncheckedCreateInput) {
    return prisma.contact.create({
      data,
    });
  }

  async findAllByCompanyId(companyId: number) {
    return prisma.contact.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: number) {
    return prisma.contact.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.ContactUncheckedUpdateInput) {
    return prisma.contact.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return prisma.contact.delete({
      where: { id },
    });
  }
}

export const contactRepository = new ContactRepository();
