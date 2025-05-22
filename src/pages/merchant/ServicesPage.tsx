
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Service, Staff } from '@/types';
import { PlusCircle, Edit, Trash, Loader2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import StaffSelector from '@/components/merchant/StaffSelector';
import AssignedStaff from '@/components/merchant/AssignedStaff';

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
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
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
    setSelectedStaffIds([]);
    setIsEditMode(false);
    setCurrentServiceId(null);
  };

  const handleCreateOrUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!merchantId) {
      toast({
        title: "Error",
        description: "Merchant information not found. Please complete onboarding first.",
      });
      return;
    }
    
    // Validate that at least one staff is selected
    if (selectedStaffIds.length === 0) {
      toast({
        title: "Error",
        description: "Please assign at least one stylist to this service.",
        variant: "destructive"
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
        
        // Update staff-service relationships
        await updateStaffServiceRelationships(currentServiceId, selectedStaffIds);
        
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
        
        const newService = data[0] as Service;
        
        // Update staff-service relationships
        await updateStaffServiceRelationships(newService.id, selectedStaffIds);
        
        // Update local state
        setServices([...services, newService]);
        
        toast({
          title: "Success",
          description: "Service created successfully.",
        });
      }
      
      resetForm();
      setIsSheetOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save service. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to update staff-service relationships
  const updateStaffServiceRelationships = async (serviceId: string, staffIds: string[]) => {
    try {
      // First, get all staff
      const { data: allStaff, error: staffError } = await supabase
        .from('staff')
        .select('*');
        
      if (staffError) throw staffError;
      
      // For each staff member, update their assigned_service_ids accordingly
      for (const staff of allStaff as Staff[]) {
        let assigned_service_ids = [...(staff.assigned_service_ids || [])];
        
        // If staff should be assigned to this service, add if not already present
        if (staffIds.includes(staff.id)) {
          if (!assigned_service_ids.includes(serviceId)) {
            assigned_service_ids.push(serviceId);
          }
        } 
        // If staff should not be assigned to this service, remove if present
        else {
          assigned_service_ids = assigned_service_ids.filter(id => id !== serviceId);
        }
        
        // Update the staff record
        const { error: updateError } = await supabase
          .from('staff')
          .update({ assigned_service_ids })
          .eq('id', staff.id);
          
        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error updating staff-service relationships:', error);
      throw error;
    }
  };

  const handleEditService = async (service: Service) => {
    setName(service.name);
    setPrice(service.price.toString());
    setDuration(service.duration.toString());
    setDescription(service.description || '');
    setIsEditMode(true);
    setCurrentServiceId(service.id);
    
    // Fetch staff assigned to this service
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .contains('assigned_service_ids', [service.id]);
        
      if (error) throw error;
      
      setSelectedStaffIds((data as Staff[]).map(staff => staff.id));
    } catch (error) {
      console.error('Error fetching service staff:', error);
    }
    
    setIsSheetOpen(true);
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setIsDialogOpen(true);
  };

  const handleDeleteService = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      // First, remove this service from all staff assigned_service_ids
      const { data: assignedStaff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .contains('assigned_service_ids', [deleteId]);
        
      if (staffError) throw staffError;
      
      for (const staff of assignedStaff as Staff[]) {
        const assigned_service_ids = staff.assigned_service_ids.filter(id => id !== deleteId);
        
        const { error: updateError } = await supabase
          .from('staff')
          .update({ assigned_service_ids })
          .eq('id', staff.id);
          
        if (updateError) throw updateError;
      }
      
      // Now delete the service
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
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openAddNewService = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-booqit-dark">Service Management</h1>
        <p className="text-booqit-dark/70 mt-2 mb-6">Create and manage the services you offer to your customers</p>
        <Button 
          onClick={openAddNewService} 
          size="lg"
          className="bg-booqit-primary hover:bg-booqit-primary/90 mx-auto"
        >
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Service
        </Button>
      </div>
      
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle>Your Services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-10 w-10 text-booqit-primary animate-spin" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusCircle className="h-10 w-10 text-booqit-dark/40" />
              </div>
              <h3 className="text-xl font-semibold text-booqit-dark mb-2">No services yet</h3>
              <p className="text-booqit-dark/60 mb-6 max-w-md mx-auto">
                Add your first service to start accepting bookings from customers
              </p>
              <Button 
                onClick={openAddNewService} 
                variant="outline"
                className="border-booqit-primary text-booqit-primary hover:bg-booqit-primary/10"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Service
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Service Name</TableHead>
                    <TableHead className="text-center">Duration</TableHead>
                    <TableHead className="text-center">Price</TableHead>
                    <TableHead className="w-1/3">Assigned Stylists</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-center">{service.duration} mins</TableCell>
                      <TableCell className="text-center">₹{service.price}</TableCell>
                      <TableCell>
                        <AssignedStaff serviceId={service.id} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditService(service)}
                          className="hover:bg-booqit-primary/10 hover:text-booqit-primary"
                          title="Edit service"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => confirmDelete(service.id)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                          title="Delete service"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Service Form in Sheet/Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{isEditMode ? 'Edit Service' : 'Add New Service'}</SheetTitle>
            <SheetDescription>
              {isEditMode 
                ? 'Update the details of your service.' 
                : 'Add a new service for your customers to book.'}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateOrUpdateService} className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="e.g. Haircut, Massage, Consultation"
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
                  placeholder="e.g. 499"
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
                  placeholder="e.g. 30"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={3} 
                placeholder="Describe your service in detail..."
              />
            </div>
            
            {merchantId && (
              <StaffSelector 
                merchantId={merchantId}
                serviceId={currentServiceId}
                selectedStaffIds={selectedStaffIds}
                onChange={setSelectedStaffIds}
              />
            )}
            
            <SheetFooter className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-booqit-primary hover:bg-booqit-primary/90"
                disabled={isSubmitting || selectedStaffIds.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  isEditMode ? "Update Service" : "Add Service"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      
      {/* Delete Confirmation Dialog */}
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
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesPage;
