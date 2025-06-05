
import React from 'react';
import { getCurrentTimeIST, getCurrentTimeISTWithBuffer, isTodayIST } from '@/utils/dateUtils';

interface SlotDebugInfoProps {
  selectedDate: Date | undefined;
  availableSlots: Array<{ time_slot: string; is_available: boolean }>;
}

const SlotDebugInfo: React.FC<SlotDebugInfoProps> = ({ selectedDate, availableSlots }) => {
  if (!selectedDate || !isTodayIST(selectedDate)) {
    return null;
  }

  const currentTime = getCurrentTimeIST();
  const expectedStart = getCurrentTimeISTWithBuffer(40);
  const firstAvailableSlot = availableSlots.find(slot => slot.is_available);
  const allSlotsBeforeBuffer = availableSlots.filter(slot => 
    slot.time_slot < expectedStart && slot.is_available
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
      <h4 className="font-medium text-blue-800 mb-2">Debug Info (Today's Slots)</h4>
      <div className="text-sm text-blue-700 space-y-1">
        <p>Current IST: <strong>{currentTime}</strong></p>
        <p>Expected start (current + 40min): <strong>{expectedStart}</strong></p>
        <p>First available slot: <strong>{firstAvailableSlot?.time_slot || 'None'}</strong></p>
        <p>Total available slots: <strong>{availableSlots.filter(s => s.is_available).length}</strong></p>
        {allSlotsBeforeBuffer.length > 0 && (
          <p className="text-red-600">
            ⚠️ Found {allSlotsBeforeBuffer.length} available slots before buffer time: {allSlotsBeforeBuffer.map(s => s.time_slot).join(', ')}
          </p>
        )}
        {allSlotsBeforeBuffer.length === 0 && firstAvailableSlot && (
          <p className="text-green-600">✅ Buffer filtering working correctly</p>
        )}
      </div>
    </div>
  );
};

export default SlotDebugInfo;
