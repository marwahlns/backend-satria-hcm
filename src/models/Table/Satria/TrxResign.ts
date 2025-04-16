import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxResign = {
  findUnique: prisma.trx_resign.findUnique,

  findMany: prisma.trx_resign.findMany,

  create: prisma.trx_resign.create,

  update: prisma.trx_resign.update,

  delete: prisma.trx_resign.delete,

  count: prisma.trx_resign.count,

  findFirst: prisma.trx_resign.findFirst,

  upsert: prisma.trx_resign.upsert,
};
