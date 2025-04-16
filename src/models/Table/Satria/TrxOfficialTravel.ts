import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxOfficialTravel = {
  findUnique: prisma.trx_official_travel.findUnique,

  findMany: prisma.trx_official_travel.findMany,

  create: prisma.trx_official_travel.create,

  update: prisma.trx_official_travel.update,

  delete: prisma.trx_official_travel.delete,

  count: prisma.trx_official_travel.count,
  findFirst: prisma.trx_official_travel.findFirst,
  upsert: prisma.trx_official_travel.upsert,
};
