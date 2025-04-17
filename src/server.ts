// src/server.ts

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import shiftRoutes from "./routes/Master/shift";
import groupShiftRoutes from "./routes/Master/groupShift";
import leaveTypeRoutes from "./routes/Master/leaveType";
import employeeRoutes from "./routes/Master/users";
import trxShiftEmployeeRoutes from "./routes/Transaksi/trxShiftEmployee";
import trxLeaveQuotaRoutes from "./routes/Transaksi/trxLeaveQuota";
import worklocationRoutes from "./routes/Master/worklocation";
import trxOvertime from "./routes/Transaksi/trxOvertimeEmployee";
import trxLeave from "./routes/Transaksi/trxLeave";
import trxOfficialTravel from "./routes/Transaksi/trxOfficialTravel";
import trxMutation from "./routes/Transaksi/trxMutation";
import trxResign from "./routes/Transaksi/trxResign";
import authRoutes from "./routes/auth";
import cors from "cors";

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
app.use("/api/trx/trxOvertime", trxOvertime);
app.use("/api/trx/trxLeave", trxLeave);
app.use("/api/trx/trxOfficialTravel", trxOfficialTravel);
app.use("/api/trx/trxMutation", trxMutation);
app.use("/api/trx/trxResign", trxResign);


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
