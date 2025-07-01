
import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HomeHeaderProps {
  userName: string;
  userAvatar: string | null;
  locationName: string;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProfileClick: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({
  userName,
  userAvatar,
  locationName,
  searchQuery,
  onSearchChange,
  onProfileClick
}) => {
  return (
    <div className="bg-gradient-to-r from-booqit-primary to-purple-700 text-white p-6 rounded-b-3xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-light">Hi {userName}! 👋</h1>
          <p className="opacity-90 flex items-center">
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 13.5C13.933 13.5 15.5 11.933 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10C8.5 11.933 10.067 13.5 12 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 21.5C17 17.5 22 14.0718 22 10C22 5.92819 17.5228 2.5 12 2.5C6.47715 2.5 2 5.92819 2 10C2 14.0718 7 17.5 12 21.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {locationName}
          </p>
        </div>
        <Avatar className="h-10 w-10 bg-white cursor-pointer" onClick={onProfileClick}>
          {userAvatar ? (
            <AvatarImage src={userAvatar} alt={userName} className="object-cover" />
          ) : (
            <AvatarFallback className="text-booqit-primary font-medium">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-booqit-primary" />
        <Input
          placeholder="Search services, shops..."
          value={searchQuery}
          onChange={onSearchChange}
          className="pl-10 bg-white text-gray-800 border-0 shadow-md focus:ring-2 focus:ring-white"
        />
      </div>
    </div>
  );
};

export default React.memo(HomeHeader);
