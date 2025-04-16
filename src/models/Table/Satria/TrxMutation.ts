import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxMutation = {
  findUnique: prisma.trx_mutation.findUnique,

  findMany: prisma.trx_mutation.findMany,

  create: prisma.trx_mutation.create,

  update: prisma.trx_mutation.update,

  delete: prisma.trx_mutation.delete,

  count: prisma.trx_mutation.count,
  findFirst: prisma.trx_mutation.findFirst,
  upsert: prisma.trx_mutation.upsert,
};
