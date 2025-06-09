
import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { formatTimeToAmPm } from '@/utils/timeUtils';
import { formatDateInIST, isTodayIST } from '@/utils/dateUtils';
import ImprovedSlotErrorHandler from './ImprovedSlotErrorHandler';

interface AvailableSlot {
  staff_id: string;
  staff_name: string;
  time_slot: string;
  is_available: boolean;
  conflict_reason: string | null;
}

interface SlotSelectorProps {
  selectedDate: Date;
  availableSlots: AvailableSlot[];
  selectedTime: string;
  loading: boolean;
  error: string;
  lastRefreshTime: Date;
  nextValidSlotTime: string | null;
  isCheckingSlot: boolean;
  onSlotClick: (timeSlot: string) => void;
  onRefresh: () => void;
  totalDuration?: number;
}

const SlotSelector: React.FC<SlotSelectorProps> = ({
  selectedDate,
  availableSlots,
  selectedTime,
  loading,
  error,
  lastRefreshTime,
  nextValidSlotTime,
  isCheckingSlot,
  onSlotClick,
  onRefresh,
  totalDuration = 10
}) => {
  const isToday = isTodayIST(selectedDate);
  
  const availableTimeSlots = availableSlots.filter(slot => slot.is_available);
  const unavailableSlots = availableSlots.filter(slot => !slot.is_available);
  
  const uniqueAvailableSlots = Array.from(new Map(
    availableTimeSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  
  const uniqueUnavailableSlots = Array.from(new Map(
    unavailableSlots.map(slot => [slot.time_slot, slot])
  ).values()).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center font-righteous">
          <Clock className="h-4 w-4 mr-2" />
          Available Time Slots ({totalDuration} min)
        </h3>
        {isToday && (
          <div className="flex items-center text-sm text-gray-500">
            <RefreshCw className="h-3 w-3 mr-1" />
            <span className="font-poppins">
              Updated {formatDateInIST(lastRefreshTime, 'HH:mm')}
            </span>
          </div>
        )}
      </div>

      {isToday && nextValidSlotTime && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700 text-sm font-poppins">
            Next available slot: {formatTimeToAmPm(nextValidSlotTime)}
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-4">
          <ImprovedSlotErrorHandler
            error={error}
            onRetry={onRefresh}
            onRefreshSlots={onRefresh}
            totalDuration={totalDuration}
          />
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
        </div>
      ) : uniqueAvailableSlots.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {uniqueAvailableSlots.map((slot) => (
              <Button
                key={slot.time_slot}
                variant={selectedTime === slot.time_slot ? "default" : "outline"}
                className={`p-3 font-poppins ${
                  selectedTime === slot.time_slot ? 'bg-booqit-primary hover:bg-booqit-primary/90' : ''
                }`}
                onClick={() => onSlotClick(slot.time_slot)}
                disabled={isCheckingSlot}
              >
                <span className="font-medium">{formatTimeToAmPm(slot.time_slot)}</span>
              </Button>
            ))}
          </div>
          
          {totalDuration > 10 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-green-700 text-sm font-poppins">
                  Showing only slots with {totalDuration} minutes of continuous availability. 
                  Each slot shown guarantees the full duration needed for your services.
                </p>
              </div>
            </div>
          )}
          
          {uniqueUnavailableSlots.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2 font-poppins">Unavailable slots:</p>
              <div className="grid grid-cols-1 gap-2">
                {uniqueUnavailableSlots.slice(0, 5).map((slot) => (
                  <div
                    key={slot.time_slot}
                    className="p-2 bg-gray-100 rounded text-sm text-gray-600 border border-gray-200 font-poppins"
                  >
                    <span className="font-medium">{formatTimeToAmPm(slot.time_slot)}</span>
                    <span className="ml-2 text-xs">- {slot.conflict_reason || 'Insufficient time available'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500 font-poppins">
            No slots available for {totalDuration} minutes
          </p>
          <p className="text-gray-400 text-sm font-poppins mt-1">
            Try selecting a different date or reducing service duration
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 font-poppins"
            onClick={onRefresh}
          >
            Refresh Slots
          </Button>
        </div>
      )}
    </div>
  );
};

export default SlotSelector;
