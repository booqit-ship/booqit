
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

// CRITICAL: Get current time with buffer and rounded to next 10-minute mark (for slot generation)
// This MUST match the SQL function logic exactly
export const getCurrentTimeISTWithBuffer = (bufferMinutes: number = 40): string => {
  const now = new Date();
  const istNow = convertUTCToIST(now);
  
  console.log('=== BUFFER CALCULATION DEBUG ===');
  console.log('Current UTC time:', format(now, 'HH:mm:ss'));
  console.log('Current IST time:', format(istNow, 'HH:mm:ss'));
  
  // Convert to total minutes (EXACT same logic as SQL)
  const currentHours = istNow.getHours();
  const currentMinutes = istNow.getMinutes();
  let totalMinutes = currentHours * 60 + currentMinutes;
  
  console.log('Current time in total minutes:', totalMinutes);
  console.log('Buffer minutes to add:', bufferMinutes);
  
  // Add buffer minutes
  totalMinutes += bufferMinutes;
  console.log('Time with buffer in total minutes:', totalMinutes);
  
  // Calculate hours and minutes from total
  let hours = Math.floor(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  
  console.log('Before rounding - hours:', hours, 'minutes:', minutes);
  
  // Round up to next 10-minute interval (EXACT same logic as SQL)
  if (minutes % 10 !== 0) {
    minutes = Math.ceil(minutes / 10) * 10;
  }
  
  console.log('After rounding - hours:', hours, 'minutes:', minutes);
  
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
  
  const finalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  console.log('Final buffer time:', finalTime);
  console.log('=== END BUFFER CALCULATION DEBUG ===');
  
  return finalTime;
};

// Generate 10-minute interval slots from start time to end time
export const generateTimeSlots = (startTime: string, endTime: string): string[] => {
  const slots: string[] = [];
  
  // Parse start time
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Convert to minutes for easier calculation
  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // Generate slots every 10 minutes
  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    
    const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    slots.push(timeSlot);
    
    currentMinutes += 10; // Add 10 minutes for next slot
  }
  
  return slots;
};

// Get slots for today with 40-minute buffer
export const getTodaySlots = (shopCloseTime: string = '21:00'): string[] => {
  const currentTimeWithBuffer = getCurrentTimeISTWithBuffer(40);
  return generateTimeSlots(currentTimeWithBuffer, shopCloseTime);
};

// Check if a date is today in IST
export const isTodayIST = (date: Date | string): boolean => {
  const istDate = convertUTCToIST(date);
  const todayIST = getCurrentDateIST();
  const result = format(istDate, 'yyyy-MM-dd') === format(todayIST, 'yyyy-MM-dd');
  console.log('Checking if date is today:', format(istDate, 'yyyy-MM-dd'), 'vs', format(todayIST, 'yyyy-MM-dd'), '=', result);
  return result;
};

// Check if a time slot is available for today (considering IST buffer)
export const isTimeSlotAvailableToday = (timeSlot: string, bufferMinutes: number = 40): boolean => {
  const currentTimeWithBuffer = getCurrentTimeISTWithBuffer(bufferMinutes);
  const result = timeSlot >= currentTimeWithBuffer;
  console.log('Checking time slot availability:', timeSlot, '>=', currentTimeWithBuffer, '=', result);
  return result;
};

// Get expected start time for today's slots (for display purposes)
export const getExpectedTodayStartTime = (): string => {
  return getCurrentTimeISTWithBuffer(40);
};

// DEBUG: Get detailed buffer calculation info
export const getBufferCalculationDebug = (): {
  currentIST: string;
  bufferTime: string;
  totalMinutesOriginal: number;
  totalMinutesWithBuffer: number;
  roundedMinutes: number;
} => {
  const now = new Date();
  const istNow = convertUTCToIST(now);
  
  const currentHours = istNow.getHours();
  const currentMinutes = istNow.getMinutes();
  const totalMinutesOriginal = currentHours * 60 + currentMinutes;
  const totalMinutesWithBuffer = totalMinutesOriginal + 40;
  
  let hours = Math.floor(totalMinutesWithBuffer / 60);
  let minutes = totalMinutesWithBuffer % 60;
  
  const originalMinutes = minutes;
  if (minutes % 10 !== 0) {
    minutes = Math.ceil(minutes / 10) * 10;
  }
  
  if (minutes >= 60) {
    hours += 1;
    minutes = 0;
  }
  
  if (hours >= 24) {
    hours = 23;
    minutes = 50;
  }
  
  return {
    currentIST: format(istNow, 'HH:mm:ss'),
    bufferTime: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    totalMinutesOriginal,
    totalMinutesWithBuffer,
    roundedMinutes: originalMinutes !== minutes ? minutes : originalMinutes
  };
};
