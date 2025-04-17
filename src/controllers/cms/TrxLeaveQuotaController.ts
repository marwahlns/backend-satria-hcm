import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxLeaveQuota } from "../../models/Table/Satria/TrxLeaveQuota";
import { User } from "../../models/Table/Satria/MsUser";
import { LeaveTypes } from "../../models/Table/Satria/MsLeaveTypes";
import { getCurrentWIBDate } from "../../helpers/timeHelper";

export const getAllTrxLeaveQuota = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const {
            page = "1",
            limit = "10",
            search = "",
            sort = "id_user",
            order = "asc",
        } = req.query;

        const pageNumber = Number(page) || 1;
        const pageSize = Number(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;
        const validSortFields = [
            "valid_from",
            "valid_to",
            "leave_type_id",
            "leaves_quota",
            "id_user",
        ];
        const sortField = validSortFields.includes(sort as string)
            ? (sort as string)
            : "id_user";
        const sortOrder = order === "desc" ? "desc" : "asc";

        const rawLeaveQuota = await TrxLeaveQuota.findMany({
            where: { is_deleted: 0 },
            orderBy: { [sortField]: sortOrder },
        });

        // Ambil id_user dari hasil query (hindari undefined/null)
        const userIds = [
            ...new Set(
                rawLeaveQuota
                    .map((se) => se.id_user)
                    .filter((id) => id !== undefined && id !== null)
            ),
        ];

        // Ambil nama user berdasarkan id_user
        const users = await User.findMany({
            where: { personal_number: { in: userIds } },
            select: { personal_number: true, name: true },
        });

        const userMap = new Map(
            users
                .filter((user) => user.personal_number !== null)
                .map((user) => [user.personal_number!.toString(), user.name])
        );

        const leaveQuotaIds: number[] = [
            ...new Set(
                rawLeaveQuota.map((se) => Number(se.leaves_type_id)).filter((id) => id)
            ),
        ];

        const leaveTypes = await LeaveTypes.findMany({
            where: { id: { in: leaveQuotaIds } },
            select: { id: true, title: true },
        });

        const leaveTypeIds = new Map(
            leaveTypes.map((leave) => [leave.id.toString(), leave.title])
        );

        // Mapping leaveQuota dengan user_name dan leave_type
        const leaveQuotaWithDetails = rawLeaveQuota.map((se) => ({
            ...se,
            id: Number(se.id),
            user_name: userMap.get(se.id_user?.toString() || "") || "Unknown",
            leaves_type: leaveTypeIds.get(se.leaves_type_id?.toString() || "") || "Unknown",
            leaves_quota: se.leaves_quota,
            valid_from: se.valid_from
                ? new Date(se.valid_from).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                })
                : null,
            valid_to: se.valid_to
                ? new Date(se.valid_to).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                })
                : null,
        }));

        const filteredQuota = leaveQuotaWithDetails.filter((item) => {
            const q = (search as string).toLowerCase();
            return (
                item.id_user?.toLowerCase().includes(q) ||
                item.user_name?.toLowerCase().includes(q) ||
                item.leaves_type?.toLowerCase().includes(q) ||
                item.valid_from?.toLowerCase().includes(q) ||
                item.valid_to?.toLowerCase().includes(q)
            );
        });

        const totalItems = filteredQuota.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const paginatedQuota = filteredQuota.slice(skip, skip + pageSize);

        res.status(200).send(
            JSONbig.stringify({
                success: true,
                message: "Successfully retrieved leave quota data",
                data: {
                    data: paginatedQuota,
                    totalPages,
                    currentPage: pageNumber,
                    totalItems,
                },
            })
        );
    } catch (err) {
        console.error("Error fetching leave quota:", err);
        res.status(500).json({
            success: false,
            message: "Error retrieving leave quota data",
        });
    }
};

export const createLeaveQuota = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id_user, id_leave_type, valid_from, valid_to, leave_quota } = req.body;

        if (!id_leave_type || !Array.isArray(id_user) || id_user.length === 0 || !valid_from || !valid_to || !leave_quota) {
            res.status(400).json({
                success: false,
                message: "All fields must be provided, and id_user must be an array",
            });
        }

        const leaveQuota = await Promise.all(
            id_user.map(async (userId: any, index: number) => {
                return TrxLeaveQuota.create({
                    data: {
                        leaves_type_id: Number(id_leave_type),
                        id_user: userId,
                        valid_from: new Date(valid_from),
                        valid_to: new Date(valid_to),
                        leaves_quota: leave_quota[index],
                        used_leave: 0,
                        leave_balance: 0,
                        is_active: 0,
                        is_deleted: 0,
                        created_at: getCurrentWIBDate(),
                        updated_at: getCurrentWIBDate(),
                    },
                });
            })
        );

        res.status(201).send(
            JSONbig.stringify({
                success: true,
                message: "Leave quota added successfully",
                data: leaveQuota,
            })
        );
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({
            success: false,
            message: "Error adding leave qouta data",
        });
    }
};

export const updateLeaveQuota = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { id_leave_type, valid_from, valid_to, leave_quota } = req.body;

        if (!id_leave_type || !valid_from || !valid_to || !leave_quota) {
            res.status(400).json({
                success: false,
                message: "All fields must be provided and cannot be empty",
            });
            return;
        }

        const existingLeaveQuota = await TrxLeaveQuota.findUnique({
            where: { id: Number(id) },
        });

        if (existingLeaveQuota === undefined|| existingLeaveQuota === null) {
            res.status(404).json({
                success: false,
                message: "Leave quota record not found",
            });
            return;
        }

        const newQuota = Number(leave_quota);
        const usedLeave = existingLeaveQuota.used_leave;

        if (usedLeave === undefined || usedLeave === null) {
            res.status(404).json({
                success: false,
                message: "Used leave quota record not found",
            });
            return;
        }

        if (newQuota < usedLeave) {
            res.status(400).json({
                success: false,
                message: `Leave quota (${newQuota}) cannot be less than used leave (${usedLeave})`,
            });
            return;
        }

        const leaveBalance = newQuota - usedLeave;

        const updatedShiftEmployee = await TrxLeaveQuota.update({
            where: { id: Number(id) },
            data: {
                leaves_type_id: Number(id_leave_type),
                valid_from: new Date(valid_from),
                valid_to: new Date(valid_to),
                leaves_quota: newQuota,
                leave_balance: leaveBalance,
            },
        });
        res.status(201).send(JSONbig.stringify({
            success: true,
            message: "Leave quota updated successfully",
            data: { updatedShiftEmployee },
        }));
    } catch (err) {
        console.error("Error while update leave quota:", err);
        res.status(500).json({ success: false, message: err });
    }
};

export const deleteLeaveQuota = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    try {
        const deletedShiftEmployee = await TrxLeaveQuota.update({
            where: { id: Number(id) },
            data: {
                is_deleted: 1
            }
        });
        if (!deletedShiftEmployee) {
            res
                .status(404)
                .json({ success: false, message: "Leave quota not found" });
        } else {
            res.status(201).json({
                success: true,
                message: "Leave quota deleted successfully",
            });
        }
    } catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Error deleting leave quota data" });
    }
};