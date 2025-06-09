
import { supabase } from '@/integrations/supabase/client';

export interface ServiceSelection {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export const createBookingWithServices = async (
  userId: string,
  merchantId: string,
  services: ServiceSelection[],
  staffId: string,
  date: string,
  timeSlot: string
) => {
  try {
    // Calculate total duration
    const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
    
    // Create the booking first (using the first service as main service for compatibility)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        merchant_id: merchantId,
        service_id: services[0].id, // Keep first service for backward compatibility
        staff_id: staffId,
        date,
        time_slot: timeSlot,
        status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      throw bookingError;
    }

    // Add all services to booking_services table
    const bookingServices = services.map(service => ({
      booking_id: booking.id,
      service_id: service.id
    }));

    const { error: servicesError } = await supabase
      .from('booking_services')
      .insert(bookingServices);

    if (servicesError) {
      console.error('Error adding booking services:', servicesError);
      // Rollback booking if services insertion fails
      await supabase.from('bookings').delete().eq('id', booking.id);
      throw servicesError;
    }

    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error('Error in createBookingWithServices:', error);
    return { success: false, error };
  }
};

export const getBookingWithServices = async (bookingId: string) => {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        merchant:merchants!inner(shop_name, address, image_url)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;

    // Get services for this booking using the RPC function
    const { data: servicesData, error: servicesError } = await supabase
      .rpc('get_booking_services', { p_booking_id: bookingId });

    if (servicesError) {
      console.error('Error fetching booking services:', servicesError);
    }

    const services = servicesData || [];
    const total_duration = services.reduce((sum: number, s: any) => sum + (s.service_duration || 0), 0);
    const total_price = services.reduce((sum: number, s: any) => sum + (s.service_price || 0), 0);

    return {
      ...booking,
      services: services.map((s: any) => ({
        service_id: s.service_id,
        service_name: s.service_name,
        service_duration: s.service_duration,
        service_price: s.service_price
      })),
      total_duration,
      total_price,
      status: booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled'
    };
  } catch (error) {
    console.error('Error in getBookingWithServices:', error);
    throw error;
  }
};
