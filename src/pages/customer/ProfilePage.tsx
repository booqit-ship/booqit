
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { User as UserIcon, Phone, Mail, LogOut, Star, Clock, Camera, Edit, Calendar, ChevronRight, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';

interface BookingHistory {
  id: string;
  date: string;
  time_slot: string;
  status: string;
  service: {
    name: string;
    price: number;
  };
  merchant: {
    shop_name: string;
  };
}

interface UserReview {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  merchant: {
    shop_name: string;
  };
  service: {
    name: string;
  };
}

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { userId, logout } = useAuth();
  const isMobile = useIsMobile();

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        
        setUser(data as User);
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url || null);

        await fetchBookingHistory();
        await fetchUserReviews();
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch your profile. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [userId]);

  // Fetch booking history
  const fetchBookingHistory = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          date,
          time_slot,
          status,
          service:service_id (
            name,
            price
          ),
          merchant:merchant_id (
            shop_name
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      setBookings(data as BookingHistory[]);
    } catch (error) {
      console.error('Error fetching booking history:', error);
    }
  };

  // Fetch user reviews
  const fetchUserReviews = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review,
          created_at,
          booking:booking_id (
            merchant:merchant_id (
              shop_name
            ),
            service:service_id (
              name
            )
          )
        `)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      const formattedReviews = data.map(item => ({
        id: item.id,
        rating: item.rating,
        review: item.review,
        created_at: item.created_at,
        merchant: item.booking.merchant,
        service: item.booking.service
      }));
      
      setReviews(formattedReviews);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone,
          // Include avatar_url in the update to match the database schema
          avatar_url: avatarUrl
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      });
      
      // Update local state
      setUser(prev => prev ? { ...prev, name, phone, avatar_url: avatarUrl } : null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    
    setIsUploading(true);
    
    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      // Update user profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      setAvatarUrl(publicUrl.publicUrl);
      
      toast({
        title: "Success",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to render stars for rating
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Your Profile</h1>
        <p className="text-booqit-dark/70">Manage your account and preferences</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <Avatar className="h-24 w-24 cursor-pointer border-2 border-booqit-primary" onClick={handleAvatarClick}>
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={user?.name || 'User'} />
                      ) : (
                        <AvatarFallback className="bg-booqit-primary/20 text-booqit-primary">
                          <UserIcon className="h-12 w-12" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="absolute bottom-0 right-0 bg-booqit-primary rounded-full p-1.5 cursor-pointer border-2 border-white" onClick={handleAvatarClick}>
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </div>
                  <h2 className="text-xl font-semibold">{user?.name}</h2>
                  <p className="text-booqit-dark/60 text-sm">{user?.role}</p>
                  
                  <Separator className="my-4" />
                  
                  <div className="w-full space-y-2">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-booqit-dark/60 mr-2" />
                      <span className="text-sm">{user?.email}</span>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-booqit-dark/60 mr-2" />
                        <span className="text-sm">{user?.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="mt-6 w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-3">
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="mb-4 w-full justify-start overflow-x-auto flex-nowrap">
                <TabsTrigger value="account" className="px-4">Account Settings</TabsTrigger>
                <TabsTrigger value="history" className="px-4">Booking History</TabsTrigger>
                <TabsTrigger value="reviews" className="px-4">Your Reviews</TabsTrigger>
              </TabsList>
              
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Edit className="h-5 w-5 mr-2 text-booqit-primary" />
                      Edit Your Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input 
                            id="name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            value={email} 
                            disabled
                            className="bg-gray-50" 
                          />
                          <p className="text-xs text-booqit-dark/60">
                            Email cannot be changed
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input 
                            id="phone" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                          />
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="bg-booqit-primary"
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-booqit-primary" />
                      Your Booking History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <div className="py-6 px-4 text-center border rounded-md">
                        <Clock className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                        <p className="text-booqit-dark/60">You don't have any bookings yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <Card key={booking.id} className="overflow-hidden">
                            <div className={`p-3 ${
                              booking.status === 'completed' ? 'bg-green-50' : 
                              booking.status === 'cancelled' ? 'bg-red-50' : 'bg-blue-50'
                            }`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-medium">{booking.service.name}</h3>
                                  <p className="text-sm text-booqit-dark/70">{booking.merchant.shop_name}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    booking.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 flex flex-col md:flex-row justify-between gap-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-booqit-dark/60" />
                                <span className="text-sm">{format(new Date(booking.date), 'EEE, MMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-booqit-dark/60" />
                                <span className="text-sm">{booking.time_slot}</span>
                              </div>
                              <div className="flex items-center font-medium">
                                <span>₹{booking.service.price.toFixed(2)}</span>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="h-5 w-5 mr-2 text-booqit-primary" />
                      Your Reviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 ? (
                      <div className="py-6 px-4 text-center border rounded-md">
                        <Star className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                        <p className="text-booqit-dark/60">You haven't submitted any reviews yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <Card key={review.id}>
                            <div className="p-4">
                              <div className="flex flex-col md:flex-row justify-between mb-3">
                                <div>
                                  <h3 className="font-medium">{review.service.name}</h3>
                                  <p className="text-sm text-booqit-dark/70">{review.merchant.shop_name}</p>
                                </div>
                                <div className="mt-2 md:mt-0">
                                  <p className="text-xs text-booqit-dark/60">
                                    {format(new Date(review.created_at), 'MMM d, yyyy')}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center mb-2">
                                {renderStars(review.rating)}
                              </div>
                              
                              {review.review && (
                                <div className="bg-muted/20 p-3 rounded-md">
                                  <p className="text-sm italic">"{review.review}"</p>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
