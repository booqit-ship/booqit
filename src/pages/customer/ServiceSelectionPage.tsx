
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Service, Merchant } from '@/types';
import { toast } from 'sonner';
import ServiceSearchBar from '@/components/common/ServiceSearchBar';
import StructuredServicesList from '@/components/common/StructuredServicesList';
import GenderFilter from '@/components/common/GenderFilter';

interface Category {
  id: string;
  name: string;
  color: string;
}

const ServiceSelectionPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Safely extract state with fallbacks
  const { merchant: initialMerchant, services: initialServices } = location.state || {};

  const [merchant, setMerchant] = useState<Merchant | null>(initialMerchant || null);
  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);

  useEffect(() => {
    // If we don't have merchant or services data, fetch them
    if (!merchant || !services.length) {
      fetchMerchantAndServices();
    }
  }, [merchantId]);

  useEffect(() => {
    // Fetch categories when we have merchantId
    if (merchantId) {
      fetchCategories();
    }
  }, [merchantId]);

  // Filter services based on search term, selected categories, and gender types
  useEffect(() => {
    let filtered = services;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by selected categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(service => {
        if (!service.categories || !Array.isArray(service.categories)) return false;
        return service.categories.some(catId => selectedCategories.includes(catId));
      });
    }

    // Filter by gender types (only for unisex shops)
    if (selectedTypes.length > 0 && merchant?.gender_focus === 'unisex') {
      filtered = filtered.filter(service => {
        return selectedTypes.includes(service.type || 'unisex');
      });
    }

    setFilteredServices(filtered);
  }, [services, searchTerm, selectedCategories, selectedTypes, merchant]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMerchantAndServices = async () => {
    try {
      setLoading(true);
      if (!merchantId) {
        toast.error('Merchant ID is missing');
        navigate('/home');
        return;
      }

      console.log('BOOKING_FLOW: Fetching merchant and services for:', merchantId);

      // Fetch merchant details
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError) {
        console.error('Error fetching merchant:', merchantError);
        toast.error('Could not load merchant details');
        navigate('/home');
        return;
      }

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', merchantId);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        toast.error('Could not load services');
        return;
      }

      console.log('BOOKING_FLOW: Fetched data:', {
        merchant: merchantData?.shop_name,
        servicesCount: servicesData?.length || 0
      });

      setMerchant(merchantData);
      
      // Transform services data to match our Service interface
      const transformedServices: Service[] = (servicesData || []).map(service => ({
        ...service,
        categories: Array.isArray(service.categories) 
          ? service.categories.map(cat => String(cat))
          : [],
        type: service.type || 'unisex'
      }));
      
      setServices(transformedServices);
    } catch (error) {
      console.error('Error fetching merchant and services:', error);
      toast.error('Could not load booking data');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleClearTypes = () => {
    setSelectedTypes([]);
  };

  const selectService = (service: Service) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    
    if (isSelected) {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
    } else {
      setSelectedServices(prev => [...prev, service]);
    }
  };

  // Calculate total price and duration for all selected services
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    if (!merchant) {
      toast.error('Merchant information is missing');
      return;
    }

    console.log('MULTIPLE_SERVICES: Selected services:', {
      count: selectedServices.length,
      services: selectedServices.map(s => ({ name: s.name, duration: s.duration })),
      totalDuration,
      totalPrice
    });

    navigate(`/booking/${merchantId}/staff`, {
      state: {
        merchant,
        selectedServices,
        totalPrice,
        totalDuration
      }
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-booqit-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show error state if no merchant data
  if (!merchant) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Unable to load merchant information</p>
        <Button onClick={() => navigate('/home')}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-white min-h-screen">
      <div className="bg-booqit-primary text-white p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-0 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Select Services</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Choose Your Services</h2>
          <p className="text-gray-500 text-sm">Select one or more services you'd like to book</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <ServiceSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            categories={categories}
            placeholder="Search services..."
          />
        </div>

        {/* Gender Filter - Only for Unisex Shops */}
        <GenderFilter
          selectedTypes={selectedTypes}
          onTypeToggle={handleTypeToggle}
          onClear={handleClearTypes}
          isUnisexShop={merchant.gender_focus === 'unisex'}
        />

        {/* Structured Services List */}
        <div className="mb-6">
          <StructuredServicesList
            services={filteredServices}
            categories={categories}
            onServiceClick={selectService}
            selectedServices={selectedServices}
            showSelection={true}
            isSelectable={true}
          />
        </div>

        {selectedServices.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Selected Services</h3>
              {selectedServices.map((service, index) => (
                <div key={service.id} className="flex justify-between text-sm mb-2">
                  <span>{service.name}</span>
                  <span>₹{service.price} ({service.duration} mins)</span>
                </div>
              ))}
              <Separator className="my-3" />
              <div className="flex justify-between font-semibold">
                <span>Total ({totalDuration} mins)</span>
                <span>₹{totalPrice}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <Button 
          className="w-full bg-booqit-primary hover:bg-booqit-primary/90 text-lg py-6"
          size="lg"
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
        >
          Continue to Stylist Selection
        </Button>
      </div>
    </div>
  );
};

export default ServiceSelectionPage;
