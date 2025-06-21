import JSONbig from "json-bigint";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../../models/Table/Satria/MsUser";
import { TrxShiftEmployee } from "../../models/Table/Satria/TrxShiftEmployee";
import bcrypt from "bcryptjs";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import dotenv from "dotenv";
import { MsDepartment } from "../../models/Table/Satria/MsDepartment";

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
      where: {
        email,
        is_active: 0
      },
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

    const deptHeadMatch = await MsDepartment.findFirst({
      where: { depthead_nrp: user.personal_number },
    });

    const isDeptHead = !!deptHeadMatch;

    const token = jwt.sign(
      {
        id: user.id.toString(),
        role_id: user.role_id,
        email: user.email,
        nrp: user.personal_number,
        name: user.name,
        departement: user.department,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.send(
      JSONbig.stringify({
        success: true,
        message: "Login successful",
        data: {
          user: {
            ...user,
            is_dept_head: isDeptHead,
          },
          access_token: token,
          token_type: "Bearer",
        },
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Error during login" });
  }
};