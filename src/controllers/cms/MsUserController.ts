import JSONbig from "json-bigint";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { User } from "../../models/Table/Satria/User";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { PrismaClient } from "../../../prisma/generated/satria-client";

const prisma = new PrismaClient();

export const getAllEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "name",
      order = "asc",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = ["name", "email", "nrp"];
    const sortField = validSortFields.includes(sort as string) ? (sort as string) : "name";
    const sortOrder = order === "desc" ? "desc" : "asc";

    // Query untuk mendapatkan user dari tabel User
    const employees = await User.findMany({
      where: {
        role_id: "10",
        OR: [
          { name: { contains: search as string } },
          { email: { contains: search as string } },
          { department: { contains: search as string } },
        ],
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const userIds: bigint[] = employees.map((user) => BigInt(user.id.toString()));

    // Query untuk mendapatkan user_detail berdasarkan user_id yang ditemukan
    const userDetails = await User.findManyUserDetail({
      where: {
        user_id: { in: userIds },
      },
      select: {
        user_id: true,
        nrp: true,
        name: true,
        email: true,
        marital_status: true,
        gender: true,
        birth_date: true,
        address: true,
        address_coordinate: true,
        plant: true,
        join_date: true,
        end_date: true,
        status: true,
        klasifikasi: true,
        vendor: true,
      },
    });

    // Gabungkan data employee dan user_detail secara manual
    const mergedData = employees.map((employee) => {
      const detail = userDetails.find((detail) => Number(detail.user_id) === Number(employee.id)) || {};
      return {
        ...employee,
        user_detail: detail, // Tambahkan detail jika ada
      };
    });

    // Query untuk mendapatkan total jumlah user sesuai pencarian
    const totalItems = await User.count({
      where: {
        OR: [
          { name: { contains: search as string } },
          { email: { contains: search as string } },
        ],
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved Employee data",
        data: {
          data: mergedData, // Data karyawan yang sudah digabung dengan detailnya
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      })
    );
  } catch (err) {
    console.error("Error retrieving employee data:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving employee data",
    });
  }
};

export const createEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      nrp,
      email,
      phone,
      gender,
      marital_status,
      address,
      vendor,
      join_date,
      end_date,
      plant,
      klasifikasi,
      superior,
      worklocation_code,
      worklocation_name,
      worklocation_lat_long,
      dept,
      department,
      section,
      division,
      bdate,
    } = req.body;

    if (!name || !email || !nrp) {
      res.status(400).json({
        success: false,
        message: "Name, Email, dan NRP wajib diisi",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash("Satria12", 10);

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name,
          email: email,
          password: hashedPassword,
          phone: phone,
          dept: dept,
          department: department,
          section: section,
          division: division,
          personal_number: nrp,
          superior: superior,
          worklocation_code: worklocation_code,
          worklocation_name: worklocation_name,
          worklocation_lat_long: worklocation_lat_long,
          role_id: "10",
          is_active: 0,
          is_blocked: 0,
          created_at: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });

      await tx.user_detail.create({
        data: {
          user_id: newUser.id,
          name: name,
          nrp: nrp,
          email: email,
          status: 1,
          birth_date: new Date(bdate),
          gender: gender,
          marital_status: Number(marital_status),
          address: address,
          vendor: Number(vendor),
          join_date: new Date(join_date),
          end_date: new Date(end_date),
          plant: plant,
          klasifikasi: Number(klasifikasi),
          created_at: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });
    });

    res.status(201).send(
      JSONbig.stringify({
        success: true,
        message: "Employee added successfully",
      })
    );
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({
      success: false,
      message: "Error adding employee data",
    });
  }
};

export const updateEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      nrp,
      email,
      phone,
      gender,
      marital_status,
      address,
      vendor,
      join_date,
      end_date,
      plant,
      klasifikasi,
      manager,
      department,
      section,
      division,
      bdate,
    } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "ID Employee wajib diisi",
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: Number(id) },
        data: {
          name,
          email,
          phone,
          department,
          section,
          division,
          updated_at: getCurrentWIBDate(),
        },
      });

      const userDetail = await tx.user_detail.findFirst({
        where: { user_id: Number(id) },
      });

      if (!userDetail) {
        throw new Error("User detail not found");
      }

      // Update user_detail
      await tx.user_detail.update({
        where: { id: userDetail.id },
        data: {
          name,
          nrp,
          email,
          birth_date: new Date(bdate),
          gender,
          marital_status: Number(marital_status),
          address,
          vendor: Number(vendor),
          join_date: new Date(join_date),
          end_date: new Date(end_date),
          plant,
          klasifikasi: Number(klasifikasi),
          updated_at: getCurrentWIBDate(),
        },
      });
    });

    res.status(200).send({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating employee data",
    });
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deletedEmployee = await User.update({
      where: { id: Number(id) },
      data: {
        is_blocked: 1,
      }
    });
    if (!deletedEmployee) {
      res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    } else {
      res.status(201).json({
        success: true,
        message: "Employee deleted successfully",
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Error deleting Employee data" });
  }
};

export const getAllVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = "" } = req.query;

    const vendorData = await User.findManyVendor({
      where: {
        OR: [
          { code: { contains: search as string } },
          { name: { contains: search as string } },
        ],
      },
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved shift data",
        data: {
          data: vendorData,
        },
      })
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving vendor data" });
    console.log("Error :", err);
  }
};

export const getAllPlant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = "" } = req.query;

    const plantData = await User.findManyPlant({
      where: {
        OR: [
          { plant_name: { contains: search as string } },
        ],
      },
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved plant data",
        data: {
          data: plantData
        },
      })
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving plant data" });
    console.log("Error :", err);
  }
};

export const getAllKlasifikasi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = "" } = req.query;

    const klasifikasiData = await User.findManyKlasifikasi({
      where: {
        OR: [
          { name: { contains: search as string } },
        ],
      },
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved klasifikasi data",
        data: {
          data: klasifikasiData
        },
      })
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving klasifikasi data" });
  }
};

export const getAllMaritalStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = "" } = req.query;

    const maritalData = await User.findManyMarital({
      where: {
        OR: [
          { code: { contains: search as string } },
          { ket: { contains: search as string } },
        ],
      },
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved marital status data",
        data: {
          data: maritalData
        },
      })
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving marital status data" });
  }
};

export const getAllSuperior = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = "" } = req.query;

    const superiorData = await User.findMany({
      where: {
        role_id: null,
        OR: [
          { personal_number: { contains: search as string } },
          { name: { contains: search as string } },
        ],
      },
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved superior data",
        data: {
          data: superiorData
        },
      })
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving superior data" });
  }
};

export const getAllDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search = "" } = req.query;

    const departmentData = await User.findManyDepartment({
      where: {
        OR: [
          { nama: { contains: search as string } },
        ],
      },
    });

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved department data",
        data: {
          data: departmentData
        },
      })
    );
  } catch (err) {
    res.status(500).json({ success: false, message: "Error retrieving department data" });
  }
};