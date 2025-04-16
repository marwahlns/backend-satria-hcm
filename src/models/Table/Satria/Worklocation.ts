import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const Worklocation = {
  findUnique: prisma.ms_worklocation.findUnique,

  findMany: prisma.ms_worklocation.findMany,

  create: prisma.ms_worklocation.create,

  update: prisma.ms_worklocation.update,

  delete: prisma.ms_worklocation.delete,

  count: prisma.ms_worklocation.count,
  findFirst: prisma.ms_worklocation.findFirst,
  upsert: prisma.ms_worklocation.upsert,
};
