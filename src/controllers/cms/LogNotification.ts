import { Request, Response } from "express";
import { Notification } from "../../models/Table/Satria/LogNotification";
import { getCurrentWIBDate } from "../../helpers/timeHelper";
import { Error } from "../../models/Table/Satria/LogError";
import JSONbig from "json-bigint";
import { User } from "../../models/Table/Satria/MsUser";

export const getAllNotification = async (
  req: Request & { user?: { nrp: string } },
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      sort = "id",
      order = "desc",
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    const nrp = req.user?.nrp;
    console.log("nrp", nrp)
    const notifikasiData = await Notification.findMany({
      where: {
        is_deleted: 0,
      },
      include: {
        MsUser: true,
      },
      orderBy: {
        [sort as string]: order === "asc" ? "asc" : "desc",
      },
      skip,
      take: pageSize,
    });

    // Ambil semua NRP yang terlibat
    const getAllNrps = (list: any): string[] => {
      const nrpSet = new Set<string>();
      list.forEach((n: any) => {
        [
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
        ].forEach((nrp) => {
          if (nrp) nrpSet.add(nrp);
        });
      });
      return Array.from(nrpSet);
    };

    const nrps = getAllNrps(notifikasiData);

    const users = await User.findMany({
      where: {
        personal_number: { in: nrps },
      },
    });

    const userMap = Object.fromEntries(
      users.map((u) => [u.personal_number, u.name])
    );

    const formattedData = notifikasiData.map((n) => {
    const title = n.tittle?.trim();
    let icon = "default";

    if (title === "Opened") {
      icon = "open";
    } else if (["Approved", "Accepted"].includes(title)) {
      icon = "approved";
    } else if (title === "Rejected") {
      icon = "rejected";
    }

    return {
      ...n,
      user_name: userMap[n.user ?? ""] ?? "-",
      accepted_by_name: userMap[n.accepted_by ?? ""] ?? "-",
      approved_by_name: userMap[n.approved_by ?? ""] ?? "-",
      accepted_by_depthead_name: userMap[n.accepted_by_depthead ?? ""] ?? "-",
      approved_by_divhead_name: userMap[n.approved_by_divhead ?? ""] ?? "-",
      approved_by_dicdiv_name: userMap[n.approved_by_dicdiv ?? ""] ?? "-",
      approved_by_deptheadhc_name: userMap[n.approved_by_deptheadhc ?? ""] ?? "-",
      approved_by_divheadhc_name: userMap[n.approved_by_divheadhc ?? ""] ?? "-",
      approved_by_dichc_name: userMap[n.approved_by_dichc ?? ""] ?? "-",
      approved_by_presdir_name: userMap[n.approved_by_presdir ?? ""] ?? "-",
      icon,
    };
  });

    const cleanedNrp = String(nrp).trim();
    const filteredData = formattedData.filter((n: any) => {
      if (!cleanedNrp) return false;

      const title = n.tittle?.trim();
      if (
        n.user === cleanedNrp &&
        ['Approved', 'Rejected', 'Cancel', 'Accepted'].includes(title)
      ) {
        return true;
      }
      const isOpened = title === 'Opened';
      if (n.accepted_to === cleanedNrp && isOpened) return true;
      if (n.approved_to === cleanedNrp && n.accepted_by) return true;
      if (n.accept_to_depthead === cleanedNrp && isOpened) return true;
      if (n.approve_to_divhead === cleanedNrp && n.accept_by_depthead) return true;
      if (n.approve_to_dicdiv === cleanedNrp && n.approve_by_divhead) return true;
      if (n.approved_to_deptheadhc === cleanedNrp && n.approve_by_dicdiv) return true;
      if (n.approved_to_divheadhc === cleanedNrp && n.approve_by_depthead_hc) return true;
      if (n.approved_to_dichc === cleanedNrp && n.approve_by_divhead_hc) return true;
      if (n.approved_to_presdir === cleanedNrp && n.approve_by_dichc) return true;

      return false;
    });

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    res.status(200).send(
      JSONbig.stringify({
        success: true,
        message: "Successfully retrieved filtered notification data",
        data: {
          data: filteredData,
          totalPages,
          currentPage: pageNumber,
          totalItems,
        },
      })
    );
  } catch (err: any) {
    await Error.create({
      data: {
        module: "getAllNotification",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({
      success: false,
      message: "Error retrieving notification data",
    });
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const deleteNotif = await Notification.update({
      where: { id: Number(id) },
      data: {
        is_deleted: 1
      }
    });
      res.status(201).json({
        success: true,
        message: "Notification deleted successfully",
      });
  } catch (err:any) {
    await Error.create({
      data: {
        module: "deleteNotification",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({ success: false, message: "Error deleting notification data" });
  }
};

export const deleteAllNotificationsByUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { nrp  } = req.params;
console.log("nrp", nrp )
  try {
    await Notification.updateMany({
      where: {
        is_deleted: 0,
        OR: [
          { user: nrp  },
          { accepted_to: nrp  },
          { approved_to: nrp  },
          { accepted_to_depthead: nrp  },
          { approved_to_divhead: nrp  },
          { approved_to_dicdiv: nrp  },
          { approved_to_deptheadhc: nrp  },
          { approved_to_divheadhc: nrp  },
          { approved_to_dichc: nrp  },
          { approved_to_presdir: nrp  },
        ],
      },
      data: {
        is_deleted: 1,
      },
    });

    res.status(201).json({
      success: true,
      message: "All user notifications marked as read",
    });
  } catch (err: any) {
    await Error.create({
      data: {
        module: "deleteAllNotificationsByUser",
        message: err?.message ?? String(err),
        created_at: getCurrentWIBDate(),
      },
    });
    res.status(500).json({
      success: false,
      message: "Failed to delete user notifications",
    });
  }
};
