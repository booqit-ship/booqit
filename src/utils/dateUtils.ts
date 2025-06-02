
import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

// Convert UTC date to IST
export const convertUTCToIST = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return toZonedTime(date, IST_TIMEZONE);
};

// Convert IST date to UTC for database storage
export const convertISTToUTC = (istDate: Date): Date => {
  return fromZonedTime(istDate, IST_TIMEZONE);
};

// Format date in IST
export const formatDateInIST = (date: Date | string, formatString: string = 'yyyy-MM-dd'): string => {
  const istDate = convertUTCToIST(date);
  return format(istDate, formatString);
};

// Format time in IST
export const formatTimeInIST = (date: Date | string, formatString: string = 'HH:mm'): string => {
  const istDate = convertUTCToIST(date);
  return format(istDate, formatString);
};

// Format datetime in IST
export const formatDateTimeInIST = (date: Date | string, formatString: string = 'MMM d, yyyy h:mm a'): string => {
  const istDate = convertUTCToIST(date);
  return format(istDate, formatString);
};

// Get current date in IST
export const getCurrentDateIST = (): Date => {
  return convertUTCToIST(new Date());
};

// Get current time in IST
export const getCurrentTimeIST = (): string => {
  return formatTimeInIST(new Date(), 'HH:mm');
};

// Check if a date is today in IST
export const isTodayIST = (date: Date | string): boolean => {
  const istDate = convertUTCToIST(date);
  const todayIST = getCurrentDateIST();
  return format(istDate, 'yyyy-MM-dd') === format(todayIST, 'yyyy-MM-dd');
};
