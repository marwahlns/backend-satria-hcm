// src/server.ts

import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import { getAllTrxData } from "./controllers/cms/TransactionController";
import { getAllNotification } from "./controllers/cms/LogNotification";

// Import semua routes
import shiftRoutes from "./routes/master/MsShiftRoutes";
import groupShiftRoutes from "./routes/master/MsShiftGroupRoutes";
import leaveTypeRoutes from "./routes/master/MsLeaveTypeRoutes";
import worklocationRoutes from "./routes/master/MsWorklocationRoutes";
import employeeRoutes from "./routes/master/MsUsersRoutes";
import trxShiftEmployeeRoutes from "./routes/transaksi/TrxShiftEmployeeRoutes";
import trxLeaveQuotaRoutes from "./routes/transaksi/TrxLeaveQuotaRoutes";
import transactionRoute from "./routes/transaksi/TransactionRoutes";
import attendanceRoute from "./routes/transaksi/AttendanceRoutes";
import notificationRoute from "./routes/master/LogNotification";
import authRoutes from "./routes/auth";

const app = express();
const server = http.createServer(app);
export const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: "*", credentials: true }));
app.use(cookieParser());

const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));

// Routes
app.use("/auth", authRoutes);
app.use("/api/master/shift", shiftRoutes);
app.use("/api/master/shift-group", groupShiftRoutes);
app.use("/api/master/leave-type", leaveTypeRoutes);
app.use("/api/master/user", employeeRoutes);
app.use("/api/master/worklocation", worklocationRoutes);
app.use("/api/trx/leave-quota", trxLeaveQuotaRoutes);
app.use("/api/trx/shift-employee", trxShiftEmployeeRoutes);
app.use("/api/trx", transactionRoute);
app.use("/api/trx/attendance", attendanceRoute);
app.use("/api/log/notification", notificationRoute);

// Fallback 404
app.get("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Page not found. Please check your URL.",
  });
});

io.on("connection", (socket) => {
  socket.on("join-room", (nrp) => {
    socket.join(nrp);
  });
  //leave
  socket.on("get-leave-count", async (payload) => {
    try {
      const fakeReq = {
        query: {
          ...payload,
          type: "leave",
        },
        user: {
          nrp: payload.nrp,
          dept_head: payload.dept_head || 0,
        },
      } as unknown as Request;

      const handleResponse = (rawData: any) => {
        const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        const acceptance = parsed.data?.totalNeedAcceptance || 0;
        const approval = parsed.data?.totalNeedApproval || 0;
        const count = acceptance + approval;

        console.log("✅ totalNeedAcceptance:", acceptance);
        console.log("✅ totalNeedApproval:", approval);
        console.log("📤 Emitting leave-count:", count);

        socket.emit("leave-count", count);
      };

      const fakeRes = {
        status(statusCode: number) {
          return {
            json: handleResponse,
            send: handleResponse,
          };
        },
        json: handleResponse,
        send: handleResponse,
      } as unknown as Response;

      await getAllTrxData(fakeReq, fakeRes);

    } catch (err) {
      console.error("leave-count error:", err);
      socket.emit("leave-count", 0);
    }
  });

  //overtime
  socket.on("get-overtime-count", async (payload) => {
    try {
      const fakeReq = {
        query: {
          ...payload,
          type: "overtime",
        },
        user: {
          nrp: payload.nrp,
          dept_head: payload.dept_head || 0,
        },
      } as unknown as Request;

      const handleResponse = (rawData: any) => {
        const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        const acceptance = parsed.data?.totalNeedAcceptance || 0;
        const approval = parsed.data?.totalNeedApproval || 0;
        const count = acceptance + approval;

        socket.emit("overtime-count", count);
      };

      const fakeRes = {
        status(statusCode: number) {
          return {
            json: handleResponse,
            send: handleResponse,
          };
        },
        json: handleResponse,
        send: handleResponse,
      } as unknown as Response;

      await getAllTrxData(fakeReq, fakeRes);

    } catch (err) {
      console.error("overtime-count error:", err);
      socket.emit("overtime-count", 0);
    }
  });

  //official travel
  socket.on("get-officialTravel-count", async (payload) => {
    try {
      const fakeReq = {
        query: {
          ...payload,
          type: "officialTravel",
        },
        user: {
          nrp: payload.nrp,
          dept_head: payload.dept_head || 0,
        },
      } as unknown as Request;

      const handleResponse = (rawData: any) => {
        const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        const accDepthead = parsed.data?.totalNeedAccDepthead || 0;
        const appDivhead = parsed.data?.totalNeedAppDivhead || 0;
        const appDicdiv = parsed.data?.totalNeedAppDicdiv || 0;
        const appDeptheadHc = parsed.data?.totalNeedAppDeptheadHc || 0;
        const appDivheadHc = parsed.data?.totalNeedAppDivheadHc || 0;
        const appDicHc = parsed.data?.totalNeedAppDicdivHc || 0;
        const appPresdir = parsed.data?.totalNeedAppPresdir || 0;
        const count = accDepthead + appDivhead + appDicdiv + appDeptheadHc + appDivheadHc + appDicHc + appPresdir;

        socket.emit("officialTravel-count", count);
      };

      const fakeRes = {
        status(statusCode: number) {
          return {
            json: handleResponse,
            send: handleResponse,
          };
        },
        json: handleResponse,
        send: handleResponse,
      } as unknown as Response;

      await getAllTrxData(fakeReq, fakeRes);

    } catch (err) {
      socket.emit("officialTravel-count", 0);
    }
  });

  //mutation
  socket.on("get-mutation-count", async (payload) => {
    try {
      const fakeReq = {
        query: {
          ...payload,
          type: "mutation",
        },
        user: {
          nrp: payload.nrp,
          dept_head: payload.dept_head || 0,
        },
      } as unknown as Request;

      const handleResponse = (rawData: any) => {
        const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        const acceptance = parsed.data?.totalNeedAcceptance || 0;
        const approval = parsed.data?.totalNeedApproval || 0;
        const count = acceptance + approval;

        socket.emit("mutation-count", count);
      };

      const fakeRes = {
        status(statusCode: number) {
          return {
            json: handleResponse,
            send: handleResponse,
          };
        },
        json: handleResponse,
        send: handleResponse,
      } as unknown as Response;

      await getAllTrxData(fakeReq, fakeRes);

    } catch (err) {
      socket.emit("mutation-count", 0);
    }
  });

  //resign
  socket.on("get-resign-count", async (payload) => {
    try {
      const fakeReq = {
        query: {
          ...payload,
          type: "resign",
        },
        user: {
          nrp: payload.nrp,
          dept_head: payload.dept_head || 0,
        },
      } as unknown as Request;

      const handleResponse = (rawData: any) => {
        const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        const acceptance = parsed.data?.totalNeedAcceptance || 0;
        const approval = parsed.data?.totalNeedApproval || 0;
        const count = acceptance + approval;

        socket.emit("resign-count", count);
      };

      const fakeRes = {
        status(statusCode: number) {
          return {
            json: handleResponse,
            send: handleResponse,
          };
        },
        json: handleResponse,
        send: handleResponse,
      } as unknown as Response;

      await getAllTrxData(fakeReq, fakeRes);

    } catch (err) {
      socket.emit("resign-count", 0);
    }
  });

  //declaration
  socket.on("get-declaration-count", async (payload) => {
    try {
      const fakeReq = {
        query: {
          ...payload,
          type: "declaration",
        },
        user: {
          nrp: payload.nrp,
          dept_head: payload.dept_head || 0,
        },
      } as unknown as Request;

      const handleResponse = (rawData: any) => {
        const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        const acceptance = parsed.data?.totalNeedAcceptance || 0;
        const approval = parsed.data?.totalNeedApproval || 0;
        const count = acceptance + approval;

        socket.emit("declaration-count", count);
      };

      const fakeRes = {
        status(statusCode: number) {
          return {
            json: handleResponse,
            send: handleResponse,
          };
        },
        json: handleResponse,
        send: handleResponse,
      } as unknown as Response;

      await getAllTrxData(fakeReq, fakeRes);

    } catch (err) {
      socket.emit("declaration-count", 0);
    }
  });

  //notifikasi
  socket.on("send-notification", async ({ nrp }) => {
  try {
    if (!nrp) return;

    const fakeReq = {
      user: { nrp },
      query: {},
    } as unknown as Request;

    const handleResponse = (rawData: any) => {
    try {
      const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      const notifArray =
        Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed?.data?.data)
          ? parsed.data.data
          : [];
      const normalizedNrp = String(nrp).trim();
      const filtered = notifArray.filter((n: any) => {
        const nrpList = [
          n.user,
          n.accepted_to,
          n.approved_to,
          n.accepted_to_depthead,
          n.approved_to_divhead,
          n.approved_to_dicdiv,
          n.approved_to_deptheadhc,
          n.approved_to_divheadhc,
          n.approved_to_dichc,
          n.approved_to_presdir,
          n.rejected_by,
        ]
          .filter(Boolean)
          .map((val) => String(val).trim());
        const match = nrpList.includes(normalizedNrp);
        if (match) {
        }

        return match;
      });

      // 📤 Kirim notifikasi yang cocok ke FE
      socket.emit("notification", filtered);
    } catch (err) {
      socket.emit("notification", []);
    }
  };


    const fakeRes = {
      status(statusCode: number) {
        return {
          json: handleResponse,
          send: handleResponse,
        };
      },
      json: handleResponse,
      send: handleResponse,
    } as unknown as Response;

    await getAllNotification(fakeReq, fakeRes);
  } catch (err) {
    socket.emit("notification", []);
  }
});

});


// Error handler
process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("Unhandled Rejection:", reason);
});

// Jalankan server
const PORT: number = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
