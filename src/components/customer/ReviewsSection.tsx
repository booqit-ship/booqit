
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  merchant: {
    shop_name: string;
  };
  service: {
    name: string;
  };
}

const fetchUserReviews = async (userId: string | null): Promise<Review[]> => {
  if (!userId) return [];
  
  try {
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        merchant:merchants!inner(shop_name),
        service:services!inner(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return [];
    }
    
    return reviewsData || [];
  } catch (error) {
    console.error('Exception fetching reviews:', error);
    return [];
  }
};

const fetchUserProfile = async (userId: string | null) => {
  if (!userId) return null;
  
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, phone') // Removed avatar_url to fix 406 error
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error('Error fetching profile for reviews:', profileError);
      return null;
    }
    
    return profileData;
  } catch (error) {
    console.error('Exception fetching profile for reviews:', error);
    return null;
  }
};

const ReviewsSection: React.FC = () => {
  const { userId, isAuthenticated } = useAuth();

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['userReviews', userId],
    queryFn: () => fetchUserReviews(userId),
    enabled: !!userId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: profile } = useQuery({
    queryKey: ['profileForReviews', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (reviewsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-20" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-600 mb-4">
            Your reviews will appear here once you start leaving feedback for salons you've visited.
          </p>
          <Button variant="outline">
            Book Your First Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Reviews</h2>
        <span className="text-sm text-gray-600">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
      </div>
      
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="bg-booqit-primary/10 text-booqit-primary">
                  {getInitials(profile?.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{review.merchant.shop_name}</h4>
                    <p className="text-sm text-gray-600">{review.service.name}</p>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
                </div>
                
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm font-medium ml-1">{review.rating}/5</span>
                </div>
                
                {review.comment && (
                  <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReviewsSection;
