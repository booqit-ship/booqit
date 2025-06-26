
-- Update the receipt data function to return properly structured data
CREATE OR REPLACE FUNCTION public.get_guest_booking_receipt_data(
  p_booking_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  receipt_data JSON;
BEGIN
  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'bookingId', b.id::text,
      'merchant', json_build_object(
        'shop_name', m.shop_name,
        'address', m.address
      ),
      'selectedServices', json_build_array(
        json_build_object(
          'id', s.id::text,
          'name', s.name,
          'duration', s.duration,
          'price', s.price
        )
      ),
      'totalPrice', s.price,
      'bookingDate', b.date::text,
      'bookingTime', b.time_slot,
      'guestInfo', json_build_object(
        'name', b.customer_name,
        'phone', b.customer_phone,
        'email', b.customer_email
      ),
      'selectedStaffDetails', CASE 
        WHEN b.stylist_name IS NOT NULL THEN json_build_object('name', b.stylist_name)
        ELSE null
      END
    )
  ) INTO receipt_data
  FROM public.bookings b
  JOIN public.merchants m ON b.merchant_id = m.id
  JOIN public.services s ON b.service_id = s.id
  WHERE b.id = p_booking_id;
  
  IF receipt_data IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  RETURN receipt_data;
END;
$$;
