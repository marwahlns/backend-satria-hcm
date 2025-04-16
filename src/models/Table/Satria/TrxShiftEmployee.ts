import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const TrxShiftEmployee = {
  findUnique: prisma.trx_shift_emp.findUnique,

  findMany: prisma.trx_shift_emp.findMany,

  create: prisma.trx_shift_emp.create,

  update: prisma.trx_shift_emp.update,

  delete: prisma.trx_shift_emp.delete,

  count: prisma.trx_shift_emp.count,
  findFirst: prisma.trx_shift_emp.findFirst,
  upsert: prisma.trx_shift_emp.upsert,
  detail: prisma.ms_detail_shift_group.findMany
};
