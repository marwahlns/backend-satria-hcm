import JSONbig from "json-bigint";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../../models/Table/Satria/MsUser";
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
    // Mencari user berdasarkan email
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

    // Menentukan role berdasarkan role_id
    let role: string;

    if (user.role_id === "10") {
      role = "Partner";
    } else if (user.superior && user.superior === user.dept_data?.depthead_nrp) {
      role = "DeptHead";
    } else if (user.superior) {
      role = "Superior";
    } else {
      role = "Admin"; 
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id.toString(),
        email: user.email,
        role: role,
        departement: user.dept_data.nama,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    // Response sukses
    res.send(
      JSONbig.stringify({
        success: true,
        message: "Login successful",
        data: { user, access_token: token, token_type: "Bearer", role: role, departement: user.dept_data.nama},
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Error during login" });
  }
};
