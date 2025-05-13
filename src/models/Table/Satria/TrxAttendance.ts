import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const Attendance = {
  findUnique: prisma.attendance.findUnique,

  findMany: prisma.attendance.findMany,

  create: prisma.attendance.create,

  update: prisma.attendance.update,
  count: prisma.attendance.count,
  findFirst: prisma.attendance.findFirst,
  upsert: prisma.attendance.upsert,
};
