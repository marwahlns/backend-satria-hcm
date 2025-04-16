import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxLeaveQuota = {
  findUnique: prisma.trx_leave_quota.findUnique,

  findMany: prisma.trx_leave_quota.findMany,

  create: prisma.trx_leave_quota.create,

  update: prisma.trx_leave_quota.update,

  delete: prisma.trx_leave_quota.delete,

  count: prisma.trx_leave_quota.count,
  findFirst: prisma.trx_leave_quota.findFirst,
  upsert: prisma.trx_leave_quota.upsert,
};