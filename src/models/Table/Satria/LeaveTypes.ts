import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const LeaveTypes = {
  findUnique: prisma.ms_leave_types.findUnique,

  findMany: prisma.ms_leave_types.findMany,

  create: prisma.ms_leave_types.create,

  update: prisma.ms_leave_types.update,

  delete: prisma.ms_leave_types.delete,

  count: prisma.ms_leave_types.count,
  findFirst: prisma.ms_leave_types.findFirst,
  upsert: prisma.ms_leave_types.upsert,
};
