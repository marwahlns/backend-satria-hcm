import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

const prisma = new SatriaClient();

export const Notification = {
  findUnique: prisma.log_notification.findUnique,

  findMany: prisma.log_notification.findMany,

  create: prisma.log_notification.create,

  update: prisma.log_notification.update,

  delete: prisma.log_notification.delete,

  count: prisma.log_notification.count,
  findFirst: prisma.log_notification.findFirst,
  upsert: prisma.log_notification.upsert,
  updateMany: prisma.log_notification.updateMany,
};
