
export type UserRole = 'customer' | 'merchant';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface Merchant {
  id: string;
  user_id: string;
  shop_name: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  open_time: string;
  close_time: string;
  category: string;
  gender_focus: string; // Updated to be non-optional since we've added it to the DB as NOT NULL
  bank_info?: BankInfo; 
  image_url?: string | null;
  created_at: string;
  rating?: number | null;
  distance?: string;
  distanceValue?: number; // Added this property for sorting and filtering
  services?: Service[]; // Added services property to support the search functionality
}

export interface BankInfo {
  id: string;
  merchant_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  upi_id?: string;
}

export interface Service {
  id: string;
  merchant_id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  description: string;
  image_url?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  merchant_id: string;
  service_id: string;
  date: string;
  time_slot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  staff_id?: string | null;
  stylist_name?: string | null; // Added stylist_name property
  service?: Service;
  merchant?: Merchant;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  method: 'card' | 'upi' | 'wallet' | 'netbanking';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  timestamp: string;
}

export interface Staff {
  id: string;
  merchant_id: string;
  name: string;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  booking_id: string;
  rating: number;
  review: string;
  created_at: string;
}

export interface StylistHoliday {
  id: string;
  staff_id: string;
  merchant_id: string;
  holiday_date: string;
  description: string | null;
  created_at: string;
}

export interface StylistBlockedSlot {
  id: string;
  staff_id: string;
  merchant_id: string;
  blocked_date: string;
  time_slot: string;
  start_time?: string | null;
  end_time?: string | null;
  description: string | null;
  created_at: string;
}
