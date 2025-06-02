
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, isToday, isTomorrow } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Users, TrendingUp } from 'lucide-react';
import CalendarNavigation from '@/components/merchant/calendar/CalendarNavigation';
import CalendarDays from '@/components/merchant/calendar/CalendarDays';
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

const CalendarManagementPage: React.FC = () => {
  const { userId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);

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
        
        setBookings(data || []);
      } catch (error) {
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
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Holiday Manager */}
          <div className="mt-6">
            <HolidayManager merchantId={merchantId} />
          </div>
        </div>

        {/* Bookings Section */}
        <div className="lg:col-span-2">
          {/* Stats Cards */}
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

          {/* Bookings List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Bookings for {getDateLabel(selectedDate)}
                  <Badge variant="outline">{stats.total} total</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <BookingsList 
                bookings={bookings}
                loading={loading}
                onStatusChange={handleStatusChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarManagementPage;
