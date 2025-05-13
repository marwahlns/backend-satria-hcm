import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const Attendance = {
    findUnique: prisma.attendance.findUnique,

    findMany: prisma.attendance.findMany,

    groupBy: prisma.attendance.groupBy,
  
    create: prisma.attendance.create,
  
    update: prisma.attendance.update,
  
    delete: prisma.attendance.delete,
  
    count: prisma.attendance.count,
    findFirst: prisma.attendance.findFirst,
    upsert: prisma.attendance.upsert,
}