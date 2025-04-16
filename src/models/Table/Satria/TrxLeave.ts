import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxLeave = {
  findUnique: prisma.trx_leaves.findUnique,

  findMany: prisma.trx_leaves.findMany,

  create: prisma.trx_leaves.create,

  update: prisma.trx_leaves.update,

  delete: prisma.trx_leaves.delete,

  count: prisma.trx_leaves.count,
  findFirst: prisma.trx_leaves.findFirst,
  upsert: prisma.trx_leaves.upsert,
};
