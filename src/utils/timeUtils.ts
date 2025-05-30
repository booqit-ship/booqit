
export const formatTimeToAmPm = (time24: string): string => {
  if (!time24) return '';
  
  try {
    // Handle both "HH:MM" and "HH:MM:SS" formats
    const timeParts = time24.split(':');
    const hour = parseInt(timeParts[0]);
    const minute = timeParts[1] || '00';
    
    if (hour === 0) {
      return `12:${minute} AM`;
    } else if (hour < 12) {
      return `${hour}:${minute} AM`;
    } else if (hour === 12) {
      return `12:${minute} PM`;
    } else {
      return `${hour - 12}:${minute} PM`;
    }
  } catch (error) {
    console.error('Error formatting time:', error);
    return time24;
  }
};

export const formatTimeFrom12To24 = (time12: string): string => {
  if (!time12) return '';
  
  try {
    // Remove extra spaces and normalize
    const cleanTime = time12.trim().toUpperCase();
    
    // Check if it's already in 24-hour format
    if (!/AM|PM/.test(cleanTime)) {
      // Assume it's already in 24-hour format, just ensure HH:MM format
      const parts = cleanTime.split(':');
      const hour = parts[0].padStart(2, '0');
      const minute = parts[1] || '00';
      return `${hour}:${minute}`;
    }
    
    // Parse 12-hour format
    const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (!timeMatch) {
      throw new Error('Invalid time format');
    }
    
    let [, hourStr, minute, period] = timeMatch;
    let hour = parseInt(hourStr);
    
    if (period === 'AM') {
      if (hour === 12) {
        hour = 0;
      }
    } else { // PM
      if (hour !== 12) {
        hour += 12;
      }
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  } catch (error) {
    console.error('Error converting time:', error);
    return time12;
  }
};

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes: number = 10): string[] => {
  const slots: string[] = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
    slots.push(minutesToTime(minutes));
  }
  
  return slots;
};

export const isToday = (dateString: string): boolean => {
  const today = new Date();
  const checkDate = new Date(dateString);
  
  return (
    today.getDate() === checkDate.getDate() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getFullYear() === checkDate.getFullYear()
  );
};

export const isTimeSlotInPast = (timeSlot: string, dateString: string, bufferMinutes: number = 0): boolean => {
  const now = new Date();
  const slotDate = new Date(dateString);
  
  // If the date is in the future, the time slot is not in the past
  if (slotDate.toDateString() !== now.toDateString()) {
    return slotDate < now;
  }
  
  // If it's today, check if the time slot is in the past
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotTime = new Date(slotDate);
  slotTime.setHours(hours, minutes, 0, 0);
  
  // Add buffer time to current time
  const currentTimeWithBuffer = new Date(now.getTime() + bufferMinutes * 60 * 1000);
  
  return slotTime < currentTimeWithBuffer;
};
