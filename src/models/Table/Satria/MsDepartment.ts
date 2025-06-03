import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const MsDepartment = {
  findUnique: prisma.mst_dept.findUnique,

  findMany: prisma.mst_dept.findMany,

  create: prisma.mst_dept.create,

  update: prisma.mst_dept.update,

  delete: prisma.mst_dept.delete,

  count: prisma.mst_dept.count,
  findFirst: prisma.mst_dept.findFirst,
  upsert: prisma.mst_dept.upsert,
};
