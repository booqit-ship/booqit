
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

// Get current time with buffer and rounded to next 10-minute mark (for slot generation)
export const getCurrentTimeISTWithBuffer = (bufferMinutes: number = 40): string => {
  const now = new Date();
  const istNow = convertUTCToIST(now);
  
  console.log('Current IST time:', format(istNow, 'HH:mm:ss'));
  
  // Add buffer minutes
  const timeWithBuffer = new Date(istNow.getTime() + bufferMinutes * 60000);
  console.log('Time with buffer:', format(timeWithBuffer, 'HH:mm:ss'));
  
  // Round up to next 10-minute interval
  const minutes = timeWithBuffer.getMinutes();
  const roundedMinutes = minutes % 10 === 0 ? minutes : Math.ceil(minutes / 10) * 10;
  
  console.log('Original minutes:', minutes, 'Rounded minutes:', roundedMinutes);
  
  // Handle hour overflow
  if (roundedMinutes >= 60) {
    timeWithBuffer.setHours(timeWithBuffer.getHours() + 1);
    timeWithBuffer.setMinutes(0);
  } else {
    timeWithBuffer.setMinutes(roundedMinutes);
  }
  
  timeWithBuffer.setSeconds(0);
  timeWithBuffer.setMilliseconds(0);
  
  const finalTime = format(timeWithBuffer, 'HH:mm');
  console.log('Final time threshold with 40min buffer and rounding:', finalTime);
  
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
