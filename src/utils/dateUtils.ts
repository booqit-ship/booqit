
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

// Get current time in IST (HH:mm format)
export const getCurrentTimeIST = (): string => {
  return formatTimeInIST(new Date(), 'HH:mm');
};

// Get current time with buffer and rounded to next 10-minute mark (for display purposes ONLY)
// The actual slot filtering is done by the backend SQL function
export const getCurrentTimeISTWithBuffer = (bufferMinutes: number = 40): string => {
  const now = new Date();
  const istNow = convertUTCToIST(now);
  
  // Convert to total minutes (same logic as SQL for consistency)
  const currentHours = istNow.getHours();
  const currentMinutes = istNow.getMinutes();
  let totalMinutes = currentHours * 60 + currentMinutes;
  
  // Add buffer minutes
  totalMinutes += bufferMinutes;
  
  // Calculate hours and minutes from total
  let hours = Math.floor(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  
  // Round up to next 10-minute interval (same logic as SQL)
  if (minutes % 10 !== 0) {
    minutes = Math.ceil(minutes / 10) * 10;
  }
  
  // Handle minute overflow
  if (minutes >= 60) {
    hours += 1;
    minutes = 0;
  }
  
  // Handle day overflow (cap at 23:50)
  if (hours >= 24) {
    hours = 23;
    minutes = 50;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Check if a date is today in IST
export const isTodayIST = (date: Date | string): boolean => {
  const istDate = convertUTCToIST(date);
  const todayIST = getCurrentDateIST();
  return format(istDate, 'yyyy-MM-dd') === format(todayIST, 'yyyy-MM-dd');
};

// REMOVED: generateTimeSlots, getTodaySlots, isTimeSlotAvailableToday
// These are now handled entirely by the backend SQL function

// Get expected start time for today's slots (for display purposes only)
export const getExpectedTodayStartTime = (): string => {
  return getCurrentTimeISTWithBuffer(40);
};
