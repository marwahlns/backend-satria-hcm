import JSONbig from "json-bigint";
import { Request, Response } from "express";
import { TrxLeaveQuota } from "../../models/Table/Satria/TrxLeaveQuota";
import { User } from "../../models/Table/Satria/MsUser";
import { LeaveTypes } from "../../models/Table/Satria/MsLeaveTypes";
import { getCurrentWIBDate } from "../../helpers/timeHelper";

export const getAllTrxLeaveQuota = async (req: Request & { user?: { nrp: string, id: number } }, res: Response): Promise<void> => {
    try {
        const {
            page = "1",
            limit = "10",
            search = "",
            sort = "id",
            order = "desc",
        } = req.query;

        const userNrp = req.user?.nrp;
        const pageNumber = Number(page) || 1;
        const pageSize = Number(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;

        const validSortFields = [
            "id",
            "valid_from",
            "valid_to",
            "leaves_type_id",
            "leaves_quota",
            "id_user",
        ];
        const sortField = validSortFields.includes(sort as string)
            ? (sort as string)
            : "id";
        const sortOrder = order === "asc" ? "asc" : "desc";

        // Tentukan kondisi `where` berdasarkan apakah user adalah admin atau bukan
        const isAdmin = userNrp === "P0120001";
        const currentDate = new Date();

        const whereClause = {
            is_deleted: 0,
            ...(isAdmin ? {} : {
                id_user: userNrp, valid_from: {
                    lte: currentDate,
                },
                valid_to: {
                    gte: currentDate,
                },
            }),
            ...(search
                ? {
                    OR: [
                        {
                            MsUser: {
                                name: {
                                    contains: search as string,
                                },
                            },
                        },
                        {
                            MsLeaveType: {
                                title: {
                                    contains: search as string,
                                },
                            },
                        }
                    ]
                }
                : {}),
        };

        const rawLeaveQuota = await TrxLeaveQuota.findMany({
            where: whereClause,
            orderBy: { [sortField]: sortOrder },
            include: {
                MsUser: {
                    select: {
                        personal_number: true,
                        name: true,
                    },
                },
                MsLeaveType: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            skip,
            take: pageSize,
        });

        const formatDate = (date?: Date | null): string | null => {
            if (!date) return null;
            return date.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        };

        const formattedLeaveQuota = rawLeaveQuota.map((se) => ({
            ...se,
            valid_from: formatDate(se.valid_from),
            valid_to: formatDate(se.valid_to),
        }));

        const totalItems = await TrxLeaveQuota.count({
            where: whereClause,
        });

        const totalPages = Math.ceil(totalItems / pageSize);

        res.status(200).send(
            JSONbig.stringify({
                success: true,
                message: "Successfully retrieved leave quota data",
                data: {
                    data: formattedLeaveQuota,
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

        if (
            !id_leave_type ||
            !Array.isArray(id_user) ||
            id_user.length === 0 ||
            !valid_from ||
            !valid_to ||
            !leave_quota
        ) {
            res.status(400).json({
                success: false,
                message: "All fields must be provided, and id_user must be an array",
            });
            return;
        }

        const startDate = new Date(valid_from);
        const endDate = new Date(valid_to);

        if (startDate > endDate) {
            res.status(400).json({
                success: false,
                message: "Valid From cannot be later than Valid To!",
            });
            return;
        }

        const validUsers = await User.findMany({
            where: {
                personal_number: { in: id_user },
            },
            select: { personal_number: true },
        });

        const validUserPersonalNumbers = validUsers.map(user => user.personal_number);

        if (validUserPersonalNumbers.length === 0) {
            res.status(400).json({
                success: false,
                message: "No valid user IDs found in the User table.",
            });
            return;
        }

        const createdLeaveQuotas = [];
        const invalidUsers: string[] = [];

        for (let i = 0; i < id_user.length; i++) {
            const userId = id_user[i];
            const quota = leave_quota[i];

            if (!validUserPersonalNumbers.includes(userId)) {
                invalidUsers.push(userId);
                continue;
            }

            const existingQuota = await TrxLeaveQuota.findFirst({
                where: {
                    id_user: userId,
                    leaves_type_id: Number(id_leave_type),
                    is_deleted: 0,
                    OR: [
                        {
                            valid_from: {
                                lte: endDate,
                            },
                            valid_to: {
                                gte: startDate,
                            },
                        },
                        {
                            valid_from: {
                                gte: startDate,
                                lte: endDate
                            }
                        },
                        {
                            valid_to: {
                                gte: startDate,
                                lte: endDate
                            }
                        }
                    ],
                },
            });

            if (existingQuota) {
                invalidUsers.push(userId);
                continue;
            }

            const newQuota = await TrxLeaveQuota.create({
                data: {
                    leaves_type_id: Number(id_leave_type),
                    id_user: userId,
                    valid_from: startDate,
                    valid_to: endDate,
                    leaves_quota: quota,
                    used_leave: 0,
                    leave_balance: quota,
                    is_active: 0,
                    is_deleted: 0,
                    created_at: getCurrentWIBDate(),
                    updated_at: getCurrentWIBDate(),
                },
            });

            createdLeaveQuotas.push(newQuota);
        }

        if (createdLeaveQuotas.length === 0) {
            res.status(400).json({
                success: false,
                message: invalidUsers.length > 0
                    ? `No leave quotas were added. The following user already have overlapping quotas or are invalid: ${invalidUsers.join(', ')}.`
                    : "No leave quotas were added due to an unknown issue.",
            });
            return;
        }

        res.status(201).send(
            JSONbig.stringify({
                success: true,
                message: `Leave quotas added successfully. ${invalidUsers.length > 0 ? `Skipped for overlapping/invalid users: ${invalidUsers.join(', ')}.` : ''}`,
                data: createdLeaveQuotas,
            })
        );
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({
            success: false,
            message: "Error adding leave quota data: " + (err instanceof Error ? err.message : "An unknown error occurred."),
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
                message: "All fields must be provided and cannot be empty.",
            });
            return;
        }

        const quotaId = Number(id);

        const existingLeaveQuota = await TrxLeaveQuota.findUnique({
            where: { id: quotaId },
        });

        if (!existingLeaveQuota) {
            res.status(404).json({
                success: false,
                message: "Leave quota record not found.",
            });
            return;
        }

        const newStartDate = new Date(valid_from);
        const newEndDate = new Date(valid_to);

        if (newStartDate > newEndDate) {
            res.status(400).json({
                success: false,
                message: "Valid To date cannot be earlier than Valid From date.",
            });
            return;
        }

        const overlappingQuota = await TrxLeaveQuota.findFirst({
            where: {
                id_user: existingLeaveQuota.id_user,
                leaves_type_id: Number(id_leave_type),
                is_deleted: 0,
                NOT: {
                    id: quotaId,
                },
                OR: [
                    {
                        valid_from: { lte: newEndDate },
                        valid_to: { gte: newStartDate },
                    },
                    {
                        valid_from: { gte: newStartDate, lte: newEndDate }
                    },
                    {
                        valid_to: { gte: newStartDate, lte: newEndDate }
                    }
                ],
            },
        });

        if (overlappingQuota) {
            res.status(400).json({
                success: false,
                message: "The provided date range overlaps with an existing leave quota for this user and leave type.",
            });
            return;
        }

        const newQuota = Number(leave_quota);
        const usedLeave = existingLeaveQuota.used_leave;

        if (usedLeave === undefined || usedLeave === null) {
            res.status(500).json({
                success: false,
                message: "Used leave data is missing for the existing quota.",
            });
            return;
        }

        if (newQuota < usedLeave) {
            res.status(400).json({
                success: false,
                message: `Leave quota (${newQuota}) cannot be less than used leave (${usedLeave}).`,
            });
            return;
        }

        const leaveBalance = newQuota - usedLeave;

        const updatedLeaveQuota = await TrxLeaveQuota.update({
            where: { id: quotaId },
            data: {
                leaves_type_id: Number(id_leave_type),
                valid_from: newStartDate,
                valid_to: newEndDate,
                leaves_quota: newQuota,
                leave_balance: leaveBalance,
                updated_at: getCurrentWIBDate(),
            },
        });

        res.status(200).send(JSONbig.stringify({
            success: true,
            message: "Leave quota updated successfully.",
            data: updatedLeaveQuota,
        }));
    } catch (err) {
        console.error("Error while updating leave quota:", err);
        res.status(500).json({
            success: false,
            message: "Error updating leave quota data: " + (err instanceof Error ? err.message : "An unknown error occurred."),
        });
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