import JSONbig from "json-bigint";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../../models/Table/Satria/MsUser";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import bcrypt from "bcryptjs";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import dotenv from "dotenv";

// Muat file .env
dotenv.config();

// Secret key untuk JWT
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

// Login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findFirst({
      where: { email },
      include: {
        dept_data: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    let shiftId: string | null = null;

    // Cek apakah user memiliki shift
    const shiftEmp = await TrxShiftEmployee.findFirst({
      where: {
        id_user: {
          equals: user.personal_number || "",
        },
      },
    });

    if (shiftEmp) {
      const shiftGroupId = shiftEmp.id_shift_group;
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const todayIndex = new Date().getDay();
      const todayDayName = daysOfWeek[todayIndex];

      const shiftDetail = await TrxShiftEmployee.detailFindFirst({
        where: {
          id_shift_group: shiftGroupId,
          index_day: todayDayName,
        },
      });

      if (shiftDetail) {
        shiftId = shiftDetail.id_shift;
      }
    }

    const token = jwt.sign(
      {
        id: user.id.toString(),
        role_id: user.role_id,
        email: user.email,
        nrp: user.personal_number,
        name: user.name,
        departement: user.department,
        shift_id: shiftId, // Bisa null jika tidak ada shift
      },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.send(
      JSONbig.stringify({
        success: true,
        message: "Login successful",
        data: { user, access_token: token, token_type: "Bearer" },
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Error during login" });
  }
};