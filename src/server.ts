// src/server.ts

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import shiftRoutes from "./routes/master/MsShiftRoutes";
import groupShiftRoutes from "./routes/master/MsShiftGroupRoutes";
import leaveTypeRoutes from "./routes/master/MsLeaveTypeRoutes";
import worklocationRoutes from "./routes/master/MsWorklocationRoutes";
import employeeRoutes from "./routes/master/MsUsersRoutes";
import trxShiftEmployeeRoutes from "./routes/transaksi/TrxShiftEmployeeRoutes";
import trxLeaveQuotaRoutes from "./routes/transaksi/TrxLeaveQuotaRoutes";
import transactionRoute from "./routes/transaksi/TransactionRoutes";
import attendanceRoute from "./routes/transaksi/AttendanceRoutes";
import authRoutes from "./routes/auth";
import cors from "cors";
import cookieParser from 'cookie-parser';


const app = express();
app.use(bodyParser.json());

// Konfigurasi CORS
const corsOptions = {
  origin: "*",
  credentials: true,

};

app.use(cors(corsOptions));

// Tambahkan route auth kalau pengen login
app.use("/auth", authRoutes);

// Gunakan routing API kalau ingin manggil api
app.use("/api/master/shift", shiftRoutes);
app.use("/api/master/shift-group", groupShiftRoutes);
app.use("/api/master/leave-type", leaveTypeRoutes);
app.use("/api/master/user", employeeRoutes);
app.use("/api/master/worklocation", worklocationRoutes);
app.use("/api/trx/leave-quota", trxLeaveQuotaRoutes);
app.use("/api/trx/shift-employee", trxShiftEmployeeRoutes);
app.use("/api/trx", transactionRoute);
app.use("/api/trx/attendance", attendanceRoute);

app.get("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Page not found. Please check your URL.",
  });
});

// Menangani uncaughtException
process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught Exception:", err);
});

// Menangani unhandledRejection
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("Unhandled Rejection:", reason);
});

// Start server di port 3000
const PORT: number = 3000;
app.listen(PORT, () => {
  console.log(`The server is running on http://localhost:${PORT}`);
});
