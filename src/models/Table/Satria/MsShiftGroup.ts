import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const ShiftGroup = {
  findUnique: prisma.ms_shift_group.findUnique,

  findMany: prisma.ms_shift_group.findMany,

  create: prisma.ms_shift_group.create,

  findFirstDetail: prisma.ms_detail_shift_group.findFirst,
  createMany: prisma.ms_detail_shift_group.createMany,
  updateMany: prisma.ms_detail_shift_group.updateMany,
  deleteMany: prisma.ms_detail_shift_group.deleteMany,

  update: prisma.ms_shift_group.update,

  delete: prisma.ms_shift_group.delete,

  count: prisma.ms_shift_group.count,
  findFirst: prisma.ms_shift_group.findFirst,
  upsert: prisma.ms_shift_group.upsert,
};
