import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const Shift = {
  findUnique: prisma.ms_shift.findUnique,

  findMany: prisma.ms_shift.findMany,

  create: prisma.ms_shift.create,

  update: prisma.ms_shift.update,

  delete: prisma.ms_shift.delete,

  count: prisma.ms_shift.count,
  findFirst: prisma.ms_shift.findFirst,
  upsert: prisma.ms_shift.upsert,
};
