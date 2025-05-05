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
    const user = await User.findFirst({
      where: { email },
      include:{
        dept_data: true
      }
    });

    // Jika user tidak ditemukan
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // Verifikasi password
    const isValidPassword = await bcrypt.compare(password, user.password);

    // Jika password tidak valid
    if (!isValidPassword) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id.toString(), role_id: user.role_id, email: user.email, nrp: user.personal_number, name: user.name, departement : user.department },
      JWT_SECRET,
      { expiresIn: "24h" } // Set token expire time
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
