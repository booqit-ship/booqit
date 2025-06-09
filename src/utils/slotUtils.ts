
import { formatDateInIST, getCurrentTimeISTWithBuffer, isTodayIST } from './dateUtils';

export interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

export interface ServiceInfo {
  id: string;
  duration: number;
}

// Calculate total duration for multiple services
export const calculateTotalServiceDuration = (services: ServiceInfo[]): number => {
  return services.reduce((total, service) => total + service.duration, 0);
};

// Filter slots based on current time and buffer for today
export const filterSlotsForToday = (
  slots: AvailableSlot[], 
  selectedDate: Date, 
  bufferMinutes: number = 40
): AvailableSlot[] => {
  if (!isTodayIST(selectedDate)) {
    return slots;
  }

  const currentTimeWithBuffer = getCurrentTimeISTWithBuffer(bufferMinutes);
  
  return slots.filter(slot => {
    if (!slot.is_available) return true; // Keep unavailable slots for display
    return slot.time_slot >= currentTimeWithBuffer;
  });
};

// Group slots by availability status
export const groupSlotsByAvailability = (slots: AvailableSlot[]) => {
  const available = slots.filter(slot => slot.is_available);
  const unavailable = slots.filter(slot => !slot.is_available);
  
  return { available, unavailable };
};

// Remove duplicate time slots (when multiple staff have same time available)
export const getUniqueTimeSlots = (slots: AvailableSlot[]): string[] => {
  return Array.from(new Set(slots.map(slot => slot.time_slot))).sort();
};

// Get best available staff for a time slot (prioritize less booked staff)
export const getBestStaffForTimeSlot = (
  slots: AvailableSlot[], 
  timeSlot: string
): AvailableSlot | undefined => {
  const availableStaffForSlot = slots.filter(
    slot => slot.time_slot === timeSlot && slot.is_available
  );
  
  // Return first available staff (could be enhanced with load balancing logic)
  return availableStaffForSlot[0];
};

// Validate if selected time slot is still available
export const validateTimeSlotSelection = (
  timeSlot: string,
  selectedDate: Date,
  availableSlots: AvailableSlot[],
  bufferMinutes: number = 40
): { isValid: boolean; reason?: string } => {
  // Check if slot exists in available slots
  const slot = availableSlots.find(s => s.time_slot === timeSlot && s.is_available);
  if (!slot) {
    return { isValid: false, reason: 'Selected time slot is not available' };
  }

  // Additional check for today's slots
  if (isTodayIST(selectedDate)) {
    const currentTimeWithBuffer = getCurrentTimeISTWithBuffer(bufferMinutes);
    if (timeSlot < currentTimeWithBuffer) {
      return { 
        isValid: false, 
        reason: `This time slot is too soon. Please select a slot at least ${bufferMinutes} minutes from now.` 
      };
    }
  }

  return { isValid: true };
};
