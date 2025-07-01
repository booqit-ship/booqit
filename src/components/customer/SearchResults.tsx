
import React from 'react';
import { Button } from '@/components/ui/button';
import { Merchant } from '@/types';

interface SearchResultsProps {
  searchResults: Merchant[];
  onShopClick: (merchant: Merchant) => void;
  onClear: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  onShopClick,
  onClear
}) => {
  if (searchResults.length === 0) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-normal text-xl">Search Results</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-booqit-primary"
        >
          Clear
        </Button>
      </div>
      <div className="space-y-4">
        {searchResults.map((merchant) => (
          <div
            key={merchant.id}
            onClick={() => onShopClick(merchant)}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{merchant.shop_name}</h3>
                <p className="text-sm text-gray-600 mt-1">{merchant.category}</p>
                <p className="text-xs text-gray-500 mt-1">{merchant.address}</p>
                {merchant.distance && (
                  <p className="text-xs text-booqit-primary mt-1">{merchant.distance}</p>
                )}
              </div>
              {merchant.rating && (
                <div className="flex items-center bg-green-100 px-2 py-1 rounded-full">
                  <span className="text-xs font-medium text-green-800">
                    ★ {merchant.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SearchResults);
