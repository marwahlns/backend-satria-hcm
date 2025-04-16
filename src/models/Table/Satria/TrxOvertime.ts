import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxOvertime = {
  findUnique: prisma.trx_ovt.findUnique,

  findMany: prisma.trx_ovt.findMany,

  create: prisma.trx_ovt.create,

  update: prisma.trx_ovt.update,

  delete: prisma.trx_ovt.delete,

  count: prisma.trx_ovt.count,
  findFirst: prisma.trx_ovt.findFirst,
  upsert: prisma.trx_ovt.upsert,
};
