
import { format, parse } from 'date-fns';

// Convert 24-hour time to 12-hour AM/PM format
export const formatTimeToAmPm = (time24: string): string => {
  try {
    // Parse the time string (assuming format like "14:30" or "14:30:00")
    const timeStr = time24.includes(':') ? time24.split(':').slice(0, 2).join(':') : time24;
    const date = parse(timeStr, 'HH:mm', new Date());
    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return time24; // Return original if parsing fails
  }
};

// Convert 12-hour AM/PM time to 24-hour format
export const formatTimeFrom12To24 = (time12: string): string => {
  try {
    const date = parse(time12, 'h:mm a', new Date());
    return format(date, 'HH:mm');
  } catch (error) {
    console.error('Error parsing AM/PM time:', error);
    return time12; // Return original if parsing fails
  }
};

// Get current time in HH:MM format
export const getCurrentTime24 = (): string => {
  return format(new Date(), 'HH:mm');
};

// Check if a time slot has passed for today (using 30 minute buffer like backend)
export const hasTimeSlotPassed = (timeSlot: string, bufferMinutes: number = 30): boolean => {
  try {
    const now = new Date();
    const slotTime = parse(timeSlot, 'HH:mm', now);
    const currentTime = new Date();
    
    // Add buffer time to current time (same as backend)
    currentTime.setMinutes(currentTime.getMinutes() + bufferMinutes);
    
    return slotTime <= currentTime;
  } catch (error) {
    console.error('Error checking time slot:', error);
    return false;
  }
};

// Check if a booking date is today
export const isToday = (dateString: string): boolean => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return dateString === today;
};

// Get time with buffer for slot availability (consistent with backend)
export const getCurrentTimeWithBuffer = (bufferMinutes: number = 30): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + bufferMinutes);
  return format(now, 'HH:mm');
};

// Check if current time has passed a specific time slot (more accurate check)
export const isTimeSlotInPast = (timeSlot: string, dateString: string, bufferMinutes: number = 30): boolean => {
  try {
    const now = new Date();
    const slotDate = new Date(dateString);
    const [hours, minutes] = timeSlot.split(':').map(Number);
    
    // Set the slot time
    slotDate.setHours(hours, minutes, 0, 0);
    
    // Add buffer to current time
    const currentTimeWithBuffer = new Date(now.getTime() + (bufferMinutes * 60 * 1000));
    
    console.log('Checking time slot:', {
      timeSlot,
      dateString,
      slotDateTime: slotDate,
      currentTimeWithBuffer,
      isPast: slotDate <= currentTimeWithBuffer
    });
    
    return slotDate <= currentTimeWithBuffer;
  } catch (error) {
    console.error('Error checking if time slot is in past:', error);
    return false;
  }
};
