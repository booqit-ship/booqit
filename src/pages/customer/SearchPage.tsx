
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Merchant } from '@/types';
import { Search, MapPin, Star } from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch all merchants on load
  useEffect(() => {
    const fetchMerchants = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('*')
          .order('rating', { ascending: false });
          
        if (error) throw error;
        
        setMerchants(data as Merchant[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch merchants. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMerchants();
  }, []);

  // Filter merchants based on search term
  const filteredMerchants = merchants.filter(merchant => 
    merchant.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled via the filteredMerchants
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Find Services</h1>
        <p className="text-booqit-dark/70">Discover local businesses and book services</p>
      </div>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for services, salons, shops..."
            className="flex-1"
          />
          <Button type="submit" className="bg-booqit-primary">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </form>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Popular Categories</h2>
        <div className="flex flex-wrap gap-2">
          {['Salon', 'Spa', 'Repair', 'Health', 'Fitness'].map(category => (
            <Button 
              key={category}
              variant="outline"
              onClick={() => setSearchTerm(category)}
              className="rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <h2 className="text-lg font-semibold mb-4">
          {searchTerm ? `Results for "${searchTerm}"` : 'All Merchants'}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-booqit-dark/70">No merchants found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMerchants.map(merchant => (
              <Card key={merchant.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-40">
                  <img 
                    src={merchant.image_url || '/placeholder.svg'} 
                    alt={merchant.shop_name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent w-full p-4">
                    <h3 className="text-white font-semibold text-lg">{merchant.shop_name}</h3>
                    <p className="text-white/80 text-sm">{merchant.category}</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center mb-2">
                    <MapPin className="w-4 h-4 text-booqit-dark/60 mr-1" />
                    <span className="text-sm text-booqit-dark/80">{merchant.address}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="font-medium">{merchant.rating || 'New'}</span>
                    </div>
                    <Button 
                      variant="default" 
                      className="bg-booqit-primary"
                      onClick={() => navigate(`/merchant/${merchant.id}`)}
                    >
                      View Services
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
