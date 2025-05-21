
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Service } from '@/types';
import { Plus, Edit, Trash } from 'lucide-react';

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  // Fetch services when merchant ID is available
  useEffect(() => {
    const fetchServices = async () => {
      if (!merchantId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        setServices(data as Service[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch services. Please try again.",
          variant: "destructive",
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchServices();
  }, [merchantId]);

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('');
    setDescription('');
    setIsEditMode(false);
    setCurrentServiceId(null);
  };

  const handleCreateOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchantId) {
      toast({
        title: "Error",
        description: "Merchant information not found. Please complete onboarding first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (isEditMode && currentServiceId) {
        // Update service
        const { error } = await supabase
          .from('services')
          .update({
            name,
            price: parseFloat(price),
            duration: parseInt(duration),
            description,
          })
          .eq('id', currentServiceId);
          
        if (error) throw error;
        
        // Update local state
        setServices(services.map(service => 
          service.id === currentServiceId 
            ? { 
                ...service, 
                name, 
                price: parseFloat(price), 
                duration: parseInt(duration), 
                description 
              } 
            : service
        ));
        
        toast({
          title: "Success",
          description: "Service updated successfully.",
        });
      } else {
        // Create new service
        const { data, error } = await supabase
          .from('services')
          .insert({
            merchant_id: merchantId,
            name,
            price: parseFloat(price),
            duration: parseInt(duration),
            description,
          })
          .select();
          
        if (error) throw error;
        
        // Update local state
        setServices([...services, data[0] as Service]);
        
        toast({
          title: "Success",
          description: "Service created successfully.",
        });
      }
      
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditService = (service: Service) => {
    setName(service.name);
    setPrice(service.price.toString());
    setDuration(service.duration.toString());
    setDescription(service.description || '');
    setIsEditMode(true);
    setCurrentServiceId(service.id);
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setIsDialogOpen(true);
  };

  const handleDeleteService = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', deleteId);
        
      if (error) throw error;
      
      // Update local state
      setServices(services.filter(service => service.id !== deleteId));
      
      toast({
        title: "Success",
        description: "Service deleted successfully.",
      });
      
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-booqit-dark mb-2">Manage Services</h1>
        <p className="text-booqit-dark/70">Add and edit services that customers can book</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{isEditMode ? 'Edit Service' : 'Add New Service'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleCreateOrUpdateService}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input 
                      id="price" 
                      type="number" 
                      value={price} 
                      onChange={(e) => setPrice(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (mins)</Label>
                    <Input 
                      id="duration" 
                      type="number" 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={3} 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                {isEditMode && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className="bg-booqit-primary ml-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : isEditMode ? "Update Service" : "Add Service"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Services</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-booqit-primary"></div>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-10 border rounded-md">
                  <Plus className="h-12 w-12 mx-auto text-booqit-dark/30 mb-2" />
                  <p className="text-booqit-dark/60 mb-4">You haven't added any services yet</p>
                  <p className="text-sm text-booqit-dark/60">
                    Add your first service using the form on the left
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>{service.duration} mins</TableCell>
                        <TableCell>₹{service.price}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditService(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => confirmDelete(service.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the service.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteService}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesPage;
