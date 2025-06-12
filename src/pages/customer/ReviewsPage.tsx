
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReviewsSection from '@/components/customer/ReviewsSection';

const ReviewsPage: React.FC = () => {
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
            <h1 className="text-xl font-semibold">My Reviews</h1>
            <p className="text-sm text-gray-600">Your reviews and ratings</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* This would show all reviews by the current user across all merchants */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600 text-center">
            Your reviews will appear here once you start leaving feedback for salons you've visited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
