
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UserReview {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  merchant_name: string;
  service_name: string;
  booking_date: string;
}

const ReviewsPage: React.FC = () => {
  const { userId } = useAuth();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserReviews();
    }
  }, [userId]);

  const fetchUserReviews = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      console.log('Fetching reviews for user:', userId);

      // Fetch all reviews by the current user with related booking and merchant info
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review,
          created_at,
          booking_id,
          bookings!inner (
            date,
            merchant_id,
            service_id,
            merchants!inner (
              shop_name
            ),
            services!inner (
              name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user reviews:', error);
        toast.error('Failed to load your reviews');
        return;
      }

      console.log('Fetched reviews data:', reviewsData);

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        return;
      }

      // Transform the data to a more usable format
      const transformedReviews: UserReview[] = reviewsData.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        review: review.review,
        created_at: review.created_at,
        merchant_name: review.bookings?.merchants?.shop_name || 'Unknown Salon',
        service_name: review.bookings?.services?.name || 'Unknown Service',
        booking_date: review.bookings?.date || ''
      }));

      setReviews(transformedReviews);
      console.log('Transformed reviews:', transformedReviews);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      toast.error('Failed to load your reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="flex items-center gap-3 p-4">
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">My Reviews</h1>
              <p className="text-sm text-gray-600">Your reviews and ratings</p>
            </div>
          </div>
        </div>

        <div className="p-4 pb-24">
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link to="/profile">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold font-righteous">My Reviews</h1>
            <p className="text-sm text-gray-600 font-poppins">Your reviews and ratings ({reviews.length})</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Merchant and Service Info */}
                    <div>
                      <h3 className="font-medium font-righteous text-lg">{review.merchant_name}</h3>
                      <p className="text-sm text-gray-600 font-poppins">{review.service_name}</p>
                      <p className="text-xs text-gray-400 font-poppins">
                        Visited on {format(new Date(review.booking_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm font-medium font-poppins">{review.rating}/5</span>
                    </div>
                    
                    {/* Review Text */}
                    {review.review && (
                      <p className="text-gray-700 font-poppins">{review.review}</p>
                    )}
                    
                    {/* Review Date */}
                    <p className="text-xs text-gray-400 font-poppins">
                      Reviewed on {format(new Date(review.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Star className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium font-righteous text-lg mb-2">No Reviews Yet</h3>
                <p className="text-gray-600 font-poppins">
                  Your reviews will appear here once you start leaving feedback for salons you've visited.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
