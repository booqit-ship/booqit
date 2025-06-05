
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

// Get current time with buffer and rounded to next 10-minute mark
// This matches EXACTLY the SQL logic for consistency
export const getCurrentTimeISTWithBuffer = (bufferMinutes: number = 40): string => {
  const now = new Date();
  const istNow = convertUTCToIST(now);
  
  // Convert to total minutes (EXACT same logic as SQL)
  const currentHours = istNow.getHours();
  const currentMinutes = istNow.getMinutes();
  let totalMinutes = currentHours * 60 + currentMinutes;
  
  // Add buffer minutes
  totalMinutes += bufferMinutes;
  
  // Calculate hours and minutes from total
  let bufferMinutes_calculated = totalMinutes % 60;
  let bufferHours = Math.floor(totalMinutes / 60);
  
  // Round minutes up to next 10-minute mark (EXACT same logic as SQL)
  if (bufferMinutes_calculated % 10 !== 0) {
    bufferMinutes_calculated = Math.ceil(bufferMinutes_calculated / 10) * 10;
  }
  
  // Handle minute overflow (EXACT same logic as SQL)
  if (bufferMinutes_calculated >= 60) {
    bufferHours += 1;
    bufferMinutes_calculated = 0;
  }
  
  // Handle day overflow (cap at 23:50) (EXACT same logic as SQL)
  if (bufferHours >= 24) {
    bufferHours = 23;
    bufferMinutes_calculated = 50;
  }
  
  return `${bufferHours.toString().padStart(2, '0')}:${bufferMinutes_calculated.toString().padStart(2, '0')}`;
};

// Check if a date is today in IST
export const isTodayIST = (date: Date | string): boolean => {
  const istDate = convertUTCToIST(date);
  const todayIST = getCurrentDateIST();
  return format(istDate, 'yyyy-MM-dd') === format(todayIST, 'yyyy-MM-dd');
};

// Get expected start time for today's slots (for display purposes)
export const getExpectedTodayStartTime = (): string => {
  return getCurrentTimeISTWithBuffer(40);
};

// Calculate time remaining until next valid slot
export const getTimeUntilNextSlot = (): { minutes: number; seconds: number } => {
  const now = new Date();
  const istNow = convertUTCToIST(now);
  const nextSlotTime = getCurrentTimeISTWithBuffer(40);
  
  const [hours, minutes] = nextSlotTime.split(':').map(Number);
  const nextSlot = new Date(istNow);
  nextSlot.setHours(hours, minutes, 0, 0);
  
  const diffMs = nextSlot.getTime() - istNow.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return {
    minutes: Math.max(0, diffMinutes),
    seconds: Math.max(0, diffSeconds)
  };
};
