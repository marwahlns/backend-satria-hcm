import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxDeclaration = {
  findUnique: prisma.trx_declaration.findUnique,

  findMany: prisma.trx_declaration.findMany,

  create: prisma.trx_declaration.create,

  update: prisma.trx_declaration.update,

  delete: prisma.trx_declaration.delete,

  count: prisma.trx_declaration.count,

  findFirst: prisma.trx_declaration.findFirst,
  
  upsert: prisma.trx_declaration.upsert,

  detail: prisma.trx_detail_declaration.findMany,
  detailFindFirst: prisma.trx_detail_declaration.findFirst
};
