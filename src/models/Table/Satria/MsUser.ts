// src/models/Table/Satria/User.ts

import { PrismaClient as SatriaClient } from "../../../../prisma/generated/satria-client";

// Inisialisasi Prisma Client
const prisma = new SatriaClient();

// Model User
export const User = {
  // Mendapatkan pengguna berdasarkan ID
  findUnique: prisma.user.findUnique,

  // Mendapatkan semua data
  findMany: prisma.user.findMany,
  findManyUserDetail: prisma.user_detail.findMany,
  findManyDept: prisma.mst_dept.findMany,
  findManyPlant: prisma.mst_plant.findMany,
  findManyKlasifikasi: prisma.ms_klasifikasi.findMany,
  findManyVendor: prisma.ms_subcont.findMany,
  findManyMarital: prisma.ms_marital_status.findMany,
  findManyDepartment: prisma.mst_dept.findMany,

  // Membuat pengguna baru
  create: prisma.user.create,
  createDetail: prisma.user_detail.create,

  // Memperbarui pengguna
  update: prisma.user.update,

  // Menghapus pengguna
  delete: prisma.user.delete,

  // Fungsi lain yang terkait dengan model user
  count: prisma.user.count,
  findFirst: prisma.user.findFirst,
  upsert: prisma.user.upsert,
};
