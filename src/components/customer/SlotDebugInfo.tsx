import React from 'react';
import { getCurrentTimeIST, getCurrentTimeISTWithBuffer, isTodayIST } from '@/utils/dateUtils';
interface SlotDebugInfoProps {
  selectedDate: Date | undefined;
  availableSlots: Array<{
    time_slot: string;
    is_available: boolean;
  }>;
}
const SlotDebugInfo: React.FC<SlotDebugInfoProps> = ({
  selectedDate,
  availableSlots
}) => {
  if (!selectedDate || !isTodayIST(selectedDate)) {
    return null;
  }
  const currentTime = getCurrentTimeIST();
  const expectedStart = getCurrentTimeISTWithBuffer(40);
  const firstAvailableSlot = availableSlots.find(slot => slot.is_available);
  const allSlotsBeforeBuffer = availableSlots.filter(slot => slot.time_slot < expectedStart && slot.is_available);
  return;
};
export default SlotDebugInfo;