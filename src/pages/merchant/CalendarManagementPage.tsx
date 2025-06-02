
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import BookingsList from '@/components/merchant/calendar/BookingsList';
import HolidayManager from '@/components/merchant/calendar/HolidayManager';

interface BookingWithCustomer {
  id: string;
  service?: {
    name: string;
  };
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string;
}

interface HolidayDate {
  id: string;
  holiday_date: string;
  description: string | null;
}

const CalendarManagementPage: React.FC = () => {
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<HolidayDate[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch merchant ID
  useEffect(() => {
    const fetchMerchantId = async () => {
      if (!userId) return;
      
      try {
        const { data: merchant, error } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (error) {
          console.error('Error fetching merchant:', error);
          return;
        }
        
        if (merchant) {
          setMerchantId(merchant.id);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    fetchMerchantId();
  }, [userId]);

  // Fetch holidays
  const fetchHolidays = async () => {
    if (!merchantId) return;
    
    setHolidaysLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_holidays')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('holiday_date', { ascending: true });
        
      if (error) {
        console.error('Error fetching holidays:', error);
        return;
      }
      
      setHolidays(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setHolidaysLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [merchantId]);

  // Generate slots for selected date when merchant changes
  useEffect(() => {
    const generateSlots = async () => {
      if (!merchantId || !selectedDate) return;
      
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        console.log('Generating slots for:', dateStr);
        
        // Use the existing dynamic slots function instead
        const { data, error } = await supabase.rpc('get_dynamic_available_slots', {
          p_merchant_id: merchantId,
          p_date: dateStr,
          p_staff_id: null
        });
        
        if (error) {
          console.error('Error with slot generation:', error);
        } else {
          console.log('Slot generation completed for:', dateStr);
        }
      } catch (error) {
        console.error('Error generating slots:', error);
      }
    };
    
    generateSlots();
  }, [merchantId, selectedDate]);

  // Fetch bookings for selected date
  useEffect(() => {
    const fetchBookings = async () => {
      if (!merchantId) return;
      
      setLoading(true);
      try {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id,
            time_slot,
            status,
            customer_name,
            customer_phone,
            customer_email,
            stylist_name,
            service:services(name)
          `)
          .eq('merchant_id', merchantId)
          .eq('date', selectedDateStr)
          .order('time_slot', { ascending: true });
          
        if (error) {
          console.error('Error fetching bookings:', error);
          toast.error('Failed to load bookings');
          return;
        }
        
        // Type cast the bookings to ensure status is properly typed
        const typedBookings = (data || []).map(booking => ({
          ...booking,
          status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'
        }));
        
        setBookings(typedBookings);
      } catch (error: any) {
        console.error('Error:', error);
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [selectedDate, merchantId]);

  const handleStatusChange = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase.rpc('update_booking_status_with_slot_management', {
        p_booking_id: bookingId,
        p_new_status: newStatus,
        p_user_id: userId
      });

      if (error) {
        console.error('Error updating booking status:', error);
        toast.error('Failed to update booking status');
        return;
      }

      // Refresh bookings
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          time_slot,
          status,
          customer_name,
          customer_phone,
          customer_email,
          stylist_name,
          service:services(name)
        `)
        .eq('merchant_id', merchantId)
        .eq('date', selectedDateStr)
        .order('time_slot', { ascending: true });
        
      if (!fetchError) {
        const typedBookings = (data || []).map(booking => ({
          ...booking,
          status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'
        }));
        setBookings(typedBookings);
      }

      toast.success(`Booking ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      const { error } = await supabase
        .from('shop_holidays')
        .delete()
        .eq('id', holidayId);

      if (error) {
        console.error('Error deleting holiday:', error);
        toast.error('Failed to delete holiday');
        return;
      }

      toast.success('Holiday deleted successfully');
      fetchHolidays(); // Refresh holidays
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d, yyyy');
  };

  const getBookingStats = () => {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    
    return { total, confirmed, completed, pending };
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = addDays(weekStart, direction === 'next' ? 7 : -7);
    setWeekStart(newWeekStart);
    if (!weekDays.some(day => isSameDay(day, selectedDate))) {
      setSelectedDate(newWeekStart);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
  };

  const stats = getBookingStats();

  if (!merchantId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-booqit-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="h-6 w-6 text-booqit-primary" />
          <h1 className="text-3xl font-bold">Calendar Management</h1>
        </div>
        <p className="text-muted-foreground">Manage your bookings and appointments</p>
      </div>

      {/* Week Calendar View */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Appointments</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-t">
            {weekDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    p-4 border-r last:border-r-0 cursor-pointer transition-colors
                    ${isSelected ? 'bg-booqit-primary/10 border-booqit-primary' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`
                      text-2xl font-bold mb-1
                      ${isCurrentDay ? 'bg-booqit-primary text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}
                      ${isSelected && !isCurrentDay ? 'text-booqit-primary' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(day, 'MMM')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-booqit-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmed</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bookings Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  📅 {format(selectedDate, 'MMMM d, yyyy')} Bookings
                  <Badge variant="outline">{stats.total} total</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <BookingsList 
                date={selectedDate}
                bookings={bookings}
                isLoading={loading}
                onStatusChange={handleStatusChange}
              />
            </CardContent>
          </Card>
        </div>

        {/* Holiday Manager */}
        <div className="lg:col-span-1">
          <HolidayManager 
            merchantId={merchantId}
            holidays={holidays}
            isLoading={holidaysLoading}
            onDeleteHoliday={handleDeleteHoliday}
            onHolidayAdded={fetchHolidays}
          />
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
