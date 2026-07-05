import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

export class NoteRepository {
  async create(data: Prisma.NoteUncheckedCreateInput) {
    // When a note is created or updated, it updates the application's updatedAt field.
    // We can do this in a transaction or let Prisma update it, but updating Application's updatedAt
    // is critical because of Requirement 3.3.3: "Highlight applications that have had no status change
    // or new notes added in the last 14 days."
    const [note] = await prisma.$transaction([
      prisma.note.create({ data }),
      prisma.application.update({
        where: { id: data.applicationId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return note;
  }

  async findAllForApplication(applicationId: number) {
    return prisma.note.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: number) {
    return prisma.note.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Prisma.NoteUncheckedUpdateInput) {
    // Similarly update application updatedAt
    const note = await prisma.note.update({
      where: { id },
      data,
    });
    
    await prisma.application.update({
      where: { id: note.applicationId },
      data: { updatedAt: new Date() },
    });

    return note;
  }

  async delete(id: number) {
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return null;

    const [deletedNote] = await prisma.$transaction([
      prisma.note.delete({ where: { id } }),
      prisma.application.update({
        where: { id: note.applicationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return deletedNote;
  }
}

export const noteRepository = new NoteRepository();
