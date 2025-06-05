
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

  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <p className="text-yellow-800 text-sm font-poppins font-semibold mb-2">
        🐛 DEBUG: Today's Slot Generation
      </p>
      <div className="text-xs text-yellow-700 space-y-1">
        <div>Current IST: {currentTime}</div>
        <div>Expected Start: {expectedStart}</div>
        <div>First Available Slot: {firstAvailableSlot?.time_slot || 'None'}</div>
        <div>Total Slots Returned: {availableSlots.length}</div>
        <div>Available Slots: {availableSlots.filter(s => s.is_available).length}</div>
        {allSlotsBeforeBuffer.length > 0 && (
          <div className="text-red-600 font-medium">
            ⚠️ BUG: {allSlotsBeforeBuffer.length} slots found before buffer time!
            <div className="ml-2">
              {allSlotsBeforeBuffer.slice(0, 3).map(slot => slot.time_slot).join(', ')}
              {allSlotsBeforeBuffer.length > 3 && '...'}
            </div>
          </div>
        )}
        {allSlotsBeforeBuffer.length === 0 && firstAvailableSlot && (
          <div className="text-green-600 font-medium">
            ✅ Slots correctly start from buffer time
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotDebugInfo;
