export const getModalType = (trx: any, userNrp: string): "action" | "detail" => {
    const statusId = Number(trx.status_id);
    const isAcceptToAndPending = statusId === 1 && trx.accept_to === userNrp;
    const isApproveTo = trx.approve_to === userNrp;
  
    if (isAcceptToAndPending) {
      return "action";
    }
  
    if (isApproveTo) {
      if (statusId === 2) {
        return "action";
      }
      if (statusId === 6) {
        return "detail";
      }
    }
  
    return "detail";
  };
  

  export const getStatusName = (statusId: bigint): string => {
    const id = Number(statusId); // konversi bigint ke number
  
    switch (id) {
      case 1:
        return "Opened";
      case 2:
        return "Partial Approved";
      case 3:
        return "Fully Approved";
      case 6:
        return "Rejected";
      case 7:
        return "Canceled";
      default:
        return "Unknown";
    }
  };
  
  