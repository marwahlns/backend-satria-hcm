// src/helpers/timeHelper.ts

export const getCurrentWIBDate = (): Date => {
  const localDate = new Date();
  const jakartaTimezoneOffset = 7 * 60; // Jakarta is UTC+7
  const jakartaDate = new Date(
    localDate.getTime() + jakartaTimezoneOffset * 60 * 1000
  );
  return jakartaDate;
};

export const getCurrentWIBTime = (): string => {
  const localDate = new Date();
  const jakartaTimezoneOffset = 7 * 60; // Jakarta is UTC+7
  const jakartaDate = new Date(localDate.getTime() + jakartaTimezoneOffset * 60 * 1000);

  const hours = String(jakartaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(jakartaDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jakartaDate.getUTCSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};