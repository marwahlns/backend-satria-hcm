import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const MsDivision = {
  findUnique: prisma.mst_division.findUnique,

  findMany: prisma.mst_division.findMany,

  create: prisma.mst_division.create,

  update: prisma.mst_division.update,

  delete: prisma.mst_division.delete,

  count: prisma.mst_division.count,
  findFirst: prisma.mst_division.findFirst,
  upsert: prisma.mst_division.upsert,
};
