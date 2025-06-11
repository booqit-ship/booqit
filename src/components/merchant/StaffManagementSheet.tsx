
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash, Loader2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import AddStaffWidget from './AddStaffWidget';

interface Staff {
  id: string;
  name: string;
  merchant_id: string;
}

interface StaffManagementSheetProps {
  merchantId: string;
  children: React.ReactNode;
}

const StaffManagementSheet: React.FC<StaffManagementSheetProps> = ({
  merchantId,
  children
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);

        if (error) throw error;
        setStaff(data as Staff[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch staff. Please try again."
        });
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (merchantId) {
      fetchStaff();
    }
  }, [merchantId, toast]);

  const handleDeleteStaff = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setStaff(staff.filter(s => s.id !== deleteId));
      toast({
        title: "Success",
        description: "Staff member deleted successfully."
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete staff member. Please try again."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStaffAdded = () => {
    // Refresh the staff list after adding a new staff member
    const fetchStaff = async () => {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId);

        if (error) throw error;
        setStaff(data as Staff[]);
      } catch (error: any) {
        console.error('Error refreshing staff:', error);
      }
    };
    
    fetchStaff();
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-xl font-light">Manage Stylists</SheetTitle>
            <SheetDescription>
              Add, edit, or remove staff members for your shop.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <Button
              onClick={() => setIsAddStaffOpen(true)}
              className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Staff Member
            </Button>

            <Card className="shadow-md">
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-medium">Current Staff</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-booqit-primary" />
                  </div>
                ) : staff.length === 0 ? (
                  <div className="text-center p-6">
                    <p className="text-gray-500">No staff members added yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {staff.map((s) => (
                          <tr key={s.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                              <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-red-100 text-red-500"
                                onClick={() => {
                                  setDeleteId(s.id);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Staff Widget */}
      <AddStaffWidget
        merchantId={merchantId}
        onStaffAdded={handleStaffAdded}
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the staff member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStaff} disabled={isDeleting}>
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
    </>
  );
};

export default StaffManagementSheet;
