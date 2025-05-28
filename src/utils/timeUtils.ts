
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

// Check if a time slot has passed for today
export const hasTimeSlotPassed = (timeSlot: string, bufferMinutes: number = 30): boolean => {
  try {
    const now = new Date();
    const slotTime = parse(timeSlot, 'HH:mm', now);
    const currentTime = new Date();
    
    // Add buffer time to current time
    currentTime.setMinutes(currentTime.getMinutes() + bufferMinutes);
    
    return slotTime <= currentTime;
  } catch (error) {
    console.error('Error checking time slot:', error);
    return false;
  }
};
