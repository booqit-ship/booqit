
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, X, Loader2, Users, Edit, Trash, UserPen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Staff {
  id: string;
  name: string;
  merchant_id: string;
}

interface AddStaffWidgetProps {
  merchantId: string;
  onStaffAdded: (staff: Staff) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AddStaffWidget: React.FC<AddStaffWidgetProps> = ({
  merchantId,
  onStaffAdded,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStaffList, setShowStaffList] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setShowStaffList(false);
    setEditingStaff(null);
    setEditName('');
    setDeleteConfirm(null);
  };

  const fetchStaffList = async () => {
    if (!merchantId) return;
    
    setIsLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching staff:', error);
        throw error;
      }
      
      console.log('Fetched staff list:', data);
      setStaffList(data as Staff[]);
    } catch (error: any) {
      console.error('Failed to fetch staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (showStaffList) {
      fetchStaffList();
    }
  }, [showStaffList, merchantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId) {
      toast({
        title: "Error",
        description: "Merchant information not found. Please complete onboarding first.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert({
          merchant_id: merchantId,
          name: name.trim()
        })
        .select();

      if (error) throw error;

      const newStaff = data[0] as Staff;
      onStaffAdded(newStaff);
      
      toast({
        title: "Success",
        description: "Staff member added successfully."
      });

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setEditName(staff.name);
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('staff')
        .update({ name: editName.trim() })
        .eq('id', editingStaff.id);

      if (error) {
        console.error('Error updating staff:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Staff member updated successfully."
      });

      setEditingStaff(null);
      setEditName('');
      fetchStaffList();
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toast({
        title: "Error",
        description: "Failed to update staff member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteConfirm) {
      console.error('No staff member selected for deletion');
      return;
    }

    console.log('Attempting to delete staff:', deleteConfirm);
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      console.log('Staff deleted successfully');
      
      toast({
        title: "Success",
        description: `${deleteConfirm.name} has been deleted successfully.`
      });

      // Close the confirmation dialog
      setDeleteConfirm(null);
      
      // Refresh the staff list
      await fetchStaffList();
      
    } catch (error: any) {
      console.error('Failed to delete staff:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete staff member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-w-[95vw] mx-auto">
          <DialogHeader className="relative">
            <DialogTitle className="text-xl font-light text-booqit-dark flex items-center gap-2">
              <Users className="h-5 w-5 text-booqit-primary" />
              {showStaffList ? 'Manage Staff Members' : 'Add New Staff Member'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-6 w-6"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              {!showStaffList ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Add, edit, or remove staff members for your shop.
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="staffName" className="text-sm font-medium">Staff Name</Label>
                      <Input
                        id="staffName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Enter staff name"
                        className="border-booqit-primary/20 focus:border-booqit-primary"
                      />
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowStaffList(true)}
                        className="flex-1 border-booqit-primary text-booqit-primary hover:bg-booqit-primary/10"
                      >
                        <UserPen className="mr-2 h-4 w-4" />
                        Edit Staff
                      </Button>
                      
                      <div className="flex flex-col-reverse sm:flex-row gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleClose}
                          disabled={isSubmitting}
                          className="flex-1 border-gray-300"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-booqit-primary hover:bg-booqit-primary/90"
                          disabled={isSubmitting || !name.trim()}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add Staff
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Manage your existing staff members
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowStaffList(false)}
                      className="text-booqit-primary hover:bg-booqit-primary/10"
                    >
                      Back to Add
                    </Button>
                  </div>

                  {isLoadingStaff ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-booqit-primary" />
                    </div>
                  ) : staffList.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No staff members added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {staffList.map((staff) => (
                        <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <span className="font-medium text-gray-900">{staff.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStaff(staff)}
                              className="h-8 w-8 hover:bg-booqit-primary/10 hover:text-booqit-primary"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                console.log('Delete button clicked for staff:', staff);
                                setDeleteConfirm(staff);
                              }}
                              className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-booqit-primary" />
              Edit Staff Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editStaffName">Staff Name</Label>
              <Input
                id="editStaffName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter staff name"
                className="border-booqit-primary/20 focus:border-booqit-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingStaff(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStaff}
              disabled={isUpdating || !editName.trim()}
              className="bg-booqit-primary hover:bg-booqit-primary/90"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Staff'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStaff}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddStaffWidget;
