import JSONbig from "json-bigint";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { User } from "../../models/Table/Satria/MsUser";
import { TrxMutation } from "../../models/Table/Satria/TrxMutation";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { PrismaClient } from "../../../prisma/generated/satria-client";
import { Error } from "../../models/Table/Satria/LogError";

const prisma = new PrismaClient();

export const getAllEmployee = async (req: Request & { user?: { nrp: string } }, res: Response): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      sort = "id",
      order = "desc",
      submition = false,
    } = req.query;

    const isSubmition = submition === "true";
    const userNrp = req.user?.nrp;
    const isAdmin = userNrp === "P0120001";
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;
    const validSortFields = ["id", "name", "email", "personal_number"];
    const sortField = validSortFields.includes(sort as string) ? (sort as string) : "id";
    const sortOrder = order === "asc" ? "asc" : "desc";

    // Ambil data user yang login untuk mendapatkan department
    const currentUser = isSubmition
      ? await User.findFirst({
          where: { personal_number: userNrp },
          select: { dept: true },
        })
      : null;

    if (isSubmition && (!currentUser || !currentUser.dept)) {
      res.status(404).json({
        success: false,
        message: "User login tidak ditemukan atau tidak memiliki department",
      });
      return;
    }

    const userDept = currentUser?.dept;

    // Build where condition berdasarkan isSubmition
    let whereCondition: any = {
      role_id: "10",
      is_active: 0,
      OR: [
        { personal_number: { contains: search as string } },
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { department: { contains: search as string } },
      ],
    };

    // Jika isSubmition = true, filter berdasarkan department
    if (isSubmition && !isAdmin) {
      whereCondition.dept = userDept;
    }

    const employees = await User.findMany({
      where: whereCondition,
      include: {
        user_detail: {
          include: {
            MsKlasifikasi: true,
            MsMarital: true,
            MsVendor: true,
          }
        }
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: pageSize,
    });

    const superiorNrps = employees
      .map(emp => emp.superior)
      .filter((personal_number): personal_number is string => !!personal_number);

    const superiorUsers = await User.findMany({
      where: { personal_number: { in: superiorNrps } },
      select: { personal_number: true, name: true },
    });

    const superiorNameMap = new Map(
      superiorUsers.map((sup) => [sup.personal_number, sup.name])
    );

    const mutations = await TrxMutation.findMany({
      where: { created_by: userNrp },
      select: {
        id: true,
        user: true,
        status_id: true,
      },
    });

    const mutationMap = new Map(mutations.map((m) => [m.user.toString(), m]));

    const latestMutations = await TrxMutation.findMany({
      select: { id: true, user: true },
      orderBy: { id: 'desc' },
    });

    const latestMap = new Map<string, number>();
    for (const m of latestMutations) {
      const key = m.user.toString();
      if (!latestMap.has(key)) {
        latestMap.set(key, m.id);
      }
    }

    const mergedData = employees.map((employee) => {
      const personalNumber = employee.personal_number?.toString() ?? "";
      const userMutation = mutationMap.get(personalNumber);
      const lastMutationId = latestMap.get(personalNumber);

      const statusId = userMutation?.status_id;
      const statusIdIsValid =
        statusId !== undefined &&
        statusId !== BigInt(6) &&
        statusId !== BigInt(7);

      const superior_name =
        superiorNameMap.get(employee.superior || "") || "-";

      // Hanya disable jika mutasi yang dibuat oleh userNrp adalah mutasi terakhir
      const isDisabled =
        userMutation?.id === lastMutationId && statusIdIsValid;

      return {
        ...employee,
        isDisable: isDisabled,
        superior_name,
      };
    });

    // Count total items dengan kondisi yang sama
    const totalItems = await User.count({
      where: {
        role_id: "10",
        is_active: 0,
        ...(isSubmition && !isAdmin ? { dept: userDept } : {}),
        OR: [
          { personal_number: { contains: search as string } },
          { name: { contains: search as string } },
          { email: { contains: search as string } },
          { department: { contains: search as string } },
        ],
      },
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved Employee data",
        data: {
          data: mergedData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      })
    );
  } catch (err:any) {
    const userNrp = req.user?.nrp;
    await Error.create({
      data: {
        module: "getAllEmployee",
        message: err?.message ?? String(err),
        created_by: userNrp ?? "-",
        created_at: getCurrentWIBDate(),
      },
    });
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
      bdate,
      gender,
      marital_status,
      address,
      vendor,
      join_date,
      end_date,
      plant,
      worklocation_code,
      worklocation_name,
      worklocation_lat_long,
      klasifikasi,
      superior,
      section_code,
      section,
      dept,
      department,
      divid,
      division,
      companyid,
      company_name,
      title,
    } = req.body;

    if (!name || !email || !nrp) {
      res.status(400).json({
        success: false,
        message: "Name, Email, dan NRP wajib diisi",
      });
      return;
    }

    // Check if email or NRP already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { personal_number: nrp }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email or NRP already exist",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash("Satria12", 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name,
          email: email,
          password: hashedPassword,
          phone: phone,
          dept: Number(dept),
          department: department,
          section_code: section_code,
          section: section,
          divid: divid,
          division: division,
          companyid: companyid,
          company_name: company_name,
          personal_number: nrp,
          superior: superior,
          worklocation_code: worklocation_code,
          worklocation_name: worklocation_name,
          worklocation_lat_long: worklocation_lat_long,
          latlon_distance: 50000, //untuk kebutuhan demo
          title: title,
          role_id: "10",
          is_active: 0,
          is_blocked: 0,
          created_at: getCurrentWIBDate(),
          updated_at: getCurrentWIBDate(),
        },
      });

      const userDetail = await tx.user_detail.create({
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

      return { user: newUser, userDetail };
    });

    res.status(201).send(
      JSONbig.stringify({
        success: true,
        message: "Employee added successfully",
      })
    );
  } catch (err:any) {
    await Error.create({
      data: {
        module: "createEmployee",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
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
      bdate,
      gender,
      marital_status,
      address,
      vendor,
      join_date,
      end_date,
      plant,
      worklocation_code,
      worklocation_name,
      worklocation_lat_long,
      klasifikasi,
      superior,
      section_code,
      section,
      dept,
      department,
      divid,
      division,
      companyid,
      company_name,
      title,
    } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "ID Employee wajib diisi",
      });
      return;
    }

    // Check if employee exists first
    const existingUser = await User.findFirst({
      where: {
        id: Number(id),
        role_id: "10",
        is_active: 0
      },
      include: {
        user_detail: true
      }
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });
      return;
    }

    if (email || nrp) {
      const duplicateCheck = [];
      if (email) duplicateCheck.push({ email });
      if (nrp) duplicateCheck.push({ personal_number: nrp });

      const duplicateUser = await User.findFirst({
        where: {
          AND: [
            { id: { not: Number(id) } },
            { OR: duplicateCheck }
          ]
        }
      });

      if (duplicateUser) {
        res.status(400).json({
          success: false,
          message: "Email atau NRP already exist",
        });
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update user table
      const updatedUser = await tx.user.update({
        where: { id: Number(id) },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(dept !== undefined && { dept: Number(dept) }),
          ...(department && { department }),
          ...(section_code && { section_code }),
          ...(section && { section }),
          ...(divid && { divid }),
          ...(division && { division }),
          ...(companyid && { companyid }),
          ...(company_name && { company_name }),
          ...(nrp && { personal_number: nrp }),
          ...(superior && { superior }),
          ...(worklocation_code && { worklocation_code }),
          ...(worklocation_name && { worklocation_name }),
          ...(worklocation_lat_long && { worklocation_lat_long }),
          ...(title && { title }),
          updated_at: getCurrentWIBDate(),
        },
      });

      // Update user_detail table
      let updatedUserDetail = null;
      if (existingUser.user_detail) {
        updatedUserDetail = await tx.user_detail.update({
          where: { id: existingUser.user_detail[0].id },
          data: {
            ...(name && { name }),
            ...(nrp && { nrp }),
            ...(email && { email }),
            ...(bdate && { birth_date: new Date(bdate) }),
            ...(gender && { gender }),
            ...(marital_status !== undefined && { marital_status: Number(marital_status) }),
            ...(address && { address }),
            ...(vendor !== undefined && { vendor: Number(vendor) }),
            ...(join_date && { join_date: new Date(join_date) }),
            ...(end_date && { end_date: new Date(end_date) }),
            ...(plant && { plant }),
            ...(klasifikasi !== undefined && { klasifikasi: Number(klasifikasi) }),
            updated_at: getCurrentWIBDate(),
          },
        });
      } else {
        // Create user_detail if it doesn't exist
        updatedUserDetail = await tx.user_detail.create({
          data: {
            user_id: Number(id),
            name: name || existingUser.name,
            nrp: nrp || existingUser.personal_number,
            email: email || existingUser.email,
            birth_date: new Date(bdate),
            gender: gender,
            marital_status: Number(marital_status),
            address: address,
            vendor: Number(vendor),
            join_date: new Date(join_date),
            end_date: new Date(end_date),
            plant: plant,
            klasifikasi: Number(klasifikasi),
            status: 1,
            created_at: getCurrentWIBDate(),
            updated_at: getCurrentWIBDate(),
          },
        });
      }

      return { user: updatedUser, userDetail: updatedUserDetail };
    });

    res.status(200).send({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (err:any) {
    await Error.create({
      data: {
        module: "updateEmployee",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
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
        is_active: 1,
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
  } catch (err:any) {
    await Error.create({
      data: {
        module: "deleteEmployee",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error deleting Employee data" });
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
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getAllVendor",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error retrieving vendor data" });
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
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getAllPlant",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error retrieving plant data" });
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
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getAllKlasifikasi",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
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
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getAllMaritalStatus",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
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
      select: {
        personal_number: true,
        name: true,
        section_code: true,
        section: true,
        divid: true,
        companyid: true,
        company_name: true,
        dept: true,
        department: true,
        division: true,
      }
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
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getAllSuperior",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
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
  } catch (err:any) {
    await Error.create({
      data: {
        module: "getAllDepartment",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error retrieving department data" });
  }
};