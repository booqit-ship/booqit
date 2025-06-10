import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/types';
import { PlusCircle, Edit, Trash, Loader2, Clock, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import AddServiceWidget from '@/components/merchant/AddServiceWidget';
import EditServiceWidget from '@/components/merchant/EditServiceWidget';
import AddStaffWidget from '@/components/merchant/AddStaffWidget';

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isServiceWidgetOpen, setIsServiceWidgetOpen] = useState(false);
  const [isEditWidgetOpen, setIsEditWidgetOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isStaffWidgetOpen, setIsStaffWidgetOpen] = useState(false);
  
  const { toast } = useToast();
  const { userId } = useAuth();
  const isMobile = useIsMobile();

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
          description: "Failed to fetch services. Please try again."
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, [merchantId]);

  const handleServiceAdded = (newService: Service) => {
    setServices([...services, newService]);
  };

  const handleServiceUpdated = (updatedService: Service) => {
    setServices(services.map(service => 
      service.id === updatedService.id ? updatedService : service
    ));
  };

  const handleStaffAdded = (newStaff: any) => {
    toast({
      title: "Success",
      description: "Staff member added successfully. You can now manage their availability."
    });
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsEditWidgetOpen(true);
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
        description: "Service deleted successfully."
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const MobileServiceCard = ({ service }: { service: Service }) => {
    return (
      <Card className="mb-5 overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow animate-fade-in">
        <CardHeader className="p-4 pb-2 bg-muted/20 border-b">
          <CardTitle className="text-lg font-semibold text-booqit-dark flex justify-between items-center">
            <span className="truncate pr-2 font-light">{service.name}</span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditService(service)}
                className="h-8 w-8 hover:bg-booqit-primary/10 hover:text-booqit-primary"
                title="Edit service"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => confirmDelete(service.id)}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                title="Delete service"
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              <span>{service.duration} mins</span>
            </div>
            <div className="font-medium text-booqit-dark flex items-center">
              <span className="text-base font-semibold">₹{service.price}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-6xl relative">
      <div className="mb-8">
        <h1 className="text-booqit-dark text-center font-light text-2xl">Service Management</h1>
        <p className="text-booqit-dark/70 mt-2 mb-6 text-center">Create and manage the services you offer to your customers</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => setIsServiceWidgetOpen(true)} 
            size={isMobile ? "default" : "lg"} 
            className="bg-booqit-primary hover:bg-booqit-primary/90"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Service
          </Button>
          
          <Button 
            onClick={() => setIsStaffWidgetOpen(true)} 
            size={isMobile ? "default" : "lg"} 
            variant="outline" 
            className="border-booqit-primary text-booqit-primary hover:bg-booqit-primary/10"
          >
            <Users className="mr-2 h-5 w-5" /> Add Staff Member
          </Button>
        </div>
      </div>

      {/* Services Display Card */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-booqit-dark font-light text-xl">Your Services</CardTitle>
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
                onClick={() => setIsServiceWidgetOpen(true)} 
                variant="outline" 
                className="border-booqit-primary text-booqit-primary hover:bg-booqit-primary/10"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Service
              </Button>
            </div>
          ) : !isLoading && services.length > 0 && !isMobile ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-1/3 py-3 text-booqit-dark/90 font-medium">Service Name</TableHead>
                    <TableHead className="text-center py-3 text-booqit-dark/90 font-medium">Duration</TableHead>
                    <TableHead className="text-center py-3 text-booqit-dark/90 font-medium">Price</TableHead>
                    <TableHead className="text-right w-28 py-3 text-booqit-dark/90 font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map(service => (
                    <TableRow key={service.id} className="hover:bg-muted/20 border-b border-gray-100">
                      <TableCell className="font-medium py-4">{service.name}</TableCell>
                      <TableCell className="text-center py-4">{service.duration} mins</TableCell>
                      <TableCell className="text-center py-4">₹{service.price}</TableCell>
                      <TableCell className="text-right space-x-1.5 py-4">
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
          ) : !isLoading && services.length > 0 && isMobile ? (
            <div className="p-5 grid grid-cols-1 gap-5">
              {services.map(service => (
                <MobileServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Add Service Widget */}
      {merchantId && (
        <AddServiceWidget
          merchantId={merchantId}
          onServiceAdded={handleServiceAdded}
          isOpen={isServiceWidgetOpen}
          onClose={() => setIsServiceWidgetOpen(false)}
        />
      )}

      {/* Edit Service Widget */}
      <EditServiceWidget
        service={editingService}
        isOpen={isEditWidgetOpen}
        onClose={() => {
          setIsEditWidgetOpen(false);
          setEditingService(null);
        }}
        onServiceUpdated={handleServiceUpdated}
      />

      {/* Add Staff Widget */}
      {merchantId && (
        <AddStaffWidget
          merchantId={merchantId}
          onStaffAdded={handleStaffAdded}
          isOpen={isStaffWidgetOpen}
          onClose={() => setIsStaffWidgetOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-light">Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the service.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService} disabled={isDeleting}>
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
