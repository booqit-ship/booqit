
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Calendar, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerWithStats {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bookings_count: number;
  last_booking: string | null;
  total_spent: number;
}

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();

  // Fetch merchant ID for the current user
  useEffect(() => {
    const fetchMerchantId = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (error) throw error;
        
        setMerchantId(data.id);
      } catch (error) {
        console.error('Error fetching merchant ID:', error);
      }
    };
    
    fetchMerchantId();
  }, [userId]);

  // Fetch customers with booking stats
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!merchantId) return;
      
      setIsLoading(true);
      try {
        // First get all bookings for this merchant
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            user_id,
            date,
            service_id,
            service:service_id (
              price
            )
          `)
          .eq('merchant_id', merchantId);
          
        if (bookingsError) throw bookingsError;
        
        // Now get all unique customer ids from these bookings
        const customerIds = [...new Set(bookingsData.map(booking => booking.user_id))];
        
        if (customerIds.length === 0) {
          setCustomers([]);
          setIsLoading(false);
          return;
        }
        
        // Get customer profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', customerIds);
          
        if (profilesError) throw profilesError;
        
        // Combine the data to get customer stats
        const customersWithStats: CustomerWithStats[] = profilesData.map(profile => {
          const customerBookings = bookingsData.filter(
            booking => booking.user_id === profile.id
          );
          
          const lastBooking = customerBookings.length > 0 
            ? customerBookings.sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0].date 
            : null;
            
          const totalSpent = customerBookings.reduce(
            (sum, booking) => sum + (booking.service?.price || 0), 
            0
          );
          
          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            bookings_count: customerBookings.length,
            last_booking: lastBooking,
            total_spent: totalSpent
          };
        });
        
        setCustomers(customersWithStats);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch customers. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomers();
  }, [merchantId]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled via filteredCustomers
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Customers</h1>
        <p className="text-booqit-dark/70">View and manage your customer relationships</p>
      </div>
      
      <div className="mb-6">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-booqit-dark/60" />
            <Input
              placeholder="Search customers by name, email or phone..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-10 border rounded-md">
              <User className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
              <p className="text-booqit-dark/60">No customers yet</p>
              <p className="text-sm text-booqit-dark/60 mt-2">
                Customers will appear here after they make a booking
              </p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-10 border rounded-md">
              <Search className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
              <p className="text-booqit-dark/60">No customers match your search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-booqit-primary/20 flex items-center justify-center mr-3">
                            <User className="h-5 w-5 text-booqit-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-2 text-booqit-dark/60" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-2 text-booqit-dark/60" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-booqit-dark/60" />
                          {customer.bookings_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.last_booking 
                          ? format(new Date(customer.last_booking), 'MMM dd, yyyy')
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>₹{customer.total_spent.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomersPage;
