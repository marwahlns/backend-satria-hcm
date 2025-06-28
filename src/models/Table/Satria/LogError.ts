import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const Error = {
  findUnique: prisma.log_error.findUnique,

  findMany: prisma.log_error.findMany,

  create: prisma.log_error.create,

  update: prisma.log_error.update,

  delete: prisma.log_error.delete,

  count: prisma.log_error.count,
  findFirst: prisma.log_error.findFirst,
  upsert: prisma.log_error.upsert,
};
