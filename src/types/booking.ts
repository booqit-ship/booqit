
export interface BookingService {
  service_id: string;
  service_name: string;
  service_duration: number;
  service_price: number;
}

export interface BookingWithServices {
  id: string;
  user_id: string;
  merchant_id: string;
  staff_id?: string | null;
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  stylist_name?: string | null;
  created_at: string;
  services: BookingService[];
  total_duration: number;
  total_price: number;
  merchant: {
    shop_name: string;
    address: string;
    image_url: string | null;
  };
}
