
import React, { useState, useEffect } from 'react';
import { Star, Edit2, Trash2, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReviewProfile {
  name: string;
  avatar_url?: string;
}

interface Review {
  id: string;
  user_id: string;
  booking_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profiles?: ReviewProfile | null;
}

interface ReviewsSectionProps {
  merchantId: string;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ merchantId }) => {
  const { userId } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReview, setEditingReview] = useState('');
  const [editingRating, setEditingRating] = useState(5);
  const [userBookings, setUserBookings] = useState<string[]>([]);
  const [hasCompletedBooking, setHasCompletedBooking] = useState(false);

  useEffect(() => {
    fetchReviews();
    if (userId) {
      fetchUserBookings();
    }
  }, [merchantId, userId]);

  const fetchUserBookings = async () => {
    if (!userId) return;
    
    try {
      console.log('Fetching completed bookings for user:', userId);
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', userId)
        .eq('merchant_id', merchantId)
        .eq('status', 'completed');
        
      if (error) throw error;
      
      const bookingIds = data?.map(booking => booking.id) || [];
      setUserBookings(bookingIds);
      setHasCompletedBooking(bookingIds.length > 0);
      console.log('User has completed bookings:', bookingIds.length > 0);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      console.log('Fetching reviews for merchant:', merchantId);
      
      // Get booking IDs for this merchant first
      const bookingIds = await getBookingIdsForMerchant();
      
      if (bookingIds.length === 0) {
        console.log('No bookings found for this merchant');
        setReviews([]);
        setLoading(false);
        return;
      }
      
      // Fetch reviews with a manual join to profiles
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });
        
      if (reviewsError) throw reviewsError;
      
      console.log('Fetched reviews:', reviewsData?.length || 0);
      
      // Fetch profile data separately for each review
      const reviewsWithProfiles: Review[] = [];
      
      for (const review of reviewsData || []) {
        console.log('Fetching profile for user:', review.user_id);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', review.user_id)
          .single();
          
        reviewsWithProfiles.push({
          ...review,
          profiles: profileData || null
        });
      }
      
      setReviews(reviewsWithProfiles);
      
      // Find user's review if they're logged in
      if (userId) {
        const userReviewData = reviewsWithProfiles.find(review => review.user_id === userId);
        setUserReview(userReviewData || null);
        console.log('User review found:', userReviewData ? 'yes' : 'no');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Could not load reviews');
    } finally {
      setLoading(false);
    }
  };

  const getBookingIdsForMerchant = async () => {
    console.log('Getting booking IDs for merchant:', merchantId);
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('status', 'completed');
      
    if (error) {
      console.error('Error fetching booking IDs:', error);
      return [];
    }
    
    console.log('Found booking IDs:', data?.length || 0);
    return data?.map(booking => booking.id) || [];
  };

  const handleSubmitReview = async () => {
    if (!userId || userBookings.length === 0) {
      toast.error('You need to complete a booking before leaving a review');
      return;
    }

    try {
      const reviewData = {
        user_id: userId,
        booking_id: userBookings[0], // Use the first completed booking
        rating: editingRating,
        review: editingReview.trim() || null
      };

      console.log('Submitting review:', reviewData);

      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', userReview.id);
          
        if (error) throw error;
        toast.success('Review updated successfully');
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert(reviewData);
          
        if (error) throw error;
        toast.success('Review submitted successfully');
      }
      
      setIsEditing(false);
      fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Could not submit review');
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    try {
      console.log('Deleting review:', userReview.id);
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', userReview.id);
        
      if (error) throw error;
      
      toast.success('Review deleted successfully');
      setUserReview(null);
      setIsEditing(false);
      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Could not delete review');
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditingReview(userReview?.review || '');
    setEditingRating(userReview?.rating || 5);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingReview('');
    setEditingRating(5);
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive && onRatingChange ? () => onRatingChange(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold font-righteous font-medium">Reviews</h3>
          <span className="text-gray-500 font-poppins">({reviews.length})</span>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center space-x-2">
            {renderStars(Math.round(parseFloat(averageRating)))}
            <span className="font-medium font-poppins">{averageRating}</span>
          </div>
        )}
      </div>

      {/* User's Review Section */}
      {userId && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 font-righteous font-medium">Your Review</h4>
            
            {!hasCompletedBooking ? (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-poppins">
                  You need to complete a booking with this salon before you can leave a review.
                </AlertDescription>
              </Alert>
            ) : !userReview && !isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="w-full font-poppins">
                Write a Review
              </Button>
            ) : isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 font-poppins">Rating</label>
                  {renderStars(editingRating, true, setEditingRating)}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 font-poppins">Review (Optional)</label>
                  <Textarea
                    value={editingReview}
                    onChange={(e) => setEditingReview(e.target.value)}
                    placeholder="Share your experience..."
                    rows={3}
                    className="font-poppins"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={handleSubmitReview} className="flex-1 font-poppins">
                    {userReview ? 'Update Review' : 'Submit Review'}
                  </Button>
                  <Button variant="outline" onClick={cancelEditing} className="font-poppins">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : userReview ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {renderStars(userReview.rating)}
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={startEditing} className="font-poppins">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeleteReview} className="font-poppins">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {userReview.review && (
                  <p className="text-gray-600 font-poppins">{userReview.review}</p>
                )}
                <p className="text-xs text-gray-400 font-poppins">
                  {format(new Date(userReview.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* All Reviews */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews
            .filter(review => review.user_id !== userId) // Don't show user's own review in the list
            .map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {review.profiles?.avatar_url ? (
                        <img
                          src={review.profiles.avatar_url}
                          alt={review.profiles?.name || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium font-poppins">
                          {review.profiles?.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-400 font-poppins">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      
                      {renderStars(review.rating)}
                      
                      {review.review && (
                        <p className="text-gray-600 mt-2 font-poppins">{review.review}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 font-righteous font-medium">No reviews yet</p>
            {hasCompletedBooking && (
              <p className="text-sm text-gray-400 mt-1 font-poppins">Be the first to leave a review!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsSection;
