import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const Employee = {
  findUnique: prisma.user.findUnique,

  findMany: prisma.user.findMany,

  create: prisma.user.create,

  update: prisma.user.update,

  delete: prisma.user.delete,

  count: prisma.user.count,
  findFirst: prisma.user.findFirst,
  upsert: prisma.user.upsert,
};
