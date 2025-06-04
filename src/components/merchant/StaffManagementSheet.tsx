
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Staff {
  id: string;
  name: string;
  created_at: string;
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
  const [loading, setLoading] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching staff:', error);
        toast.error('Failed to load staff members');
        return;
      }

      setStaff(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && merchantId) {
      fetchStaff();
    }
  }, [isOpen, merchantId]);

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) {
      toast.error('Please enter a staff name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff')
        .insert({
          merchant_id: merchantId,
          name: newStaffName.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding staff:', error);
        toast.error('Failed to add staff member');
        return;
      }

      toast.success('Staff member added successfully');
      setNewStaffName('');
      fetchStaff();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to add staff member');
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !editStaffName.trim()) {
      toast.error('Please enter a valid staff name');
      return;
    }

    try {
      const { error } = await supabase
        .from('staff')
        .update({ name: editStaffName.trim() })
        .eq('id', editingStaff.id);

      if (error) {
        console.error('Error updating staff:', error);
        toast.error('Failed to update staff member');
        return;
      }

      toast.success('Staff member updated successfully');
      setEditingStaff(null);
      setEditStaffName('');
      fetchStaff();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      // Check if staff has any bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('staff_id', staffId)
        .limit(1);

      if (bookingsError) {
        console.error('Error checking bookings:', bookingsError);
        toast.error('Failed to check staff bookings');
        return;
      }

      if (bookings && bookings.length > 0) {
        toast.error('Cannot delete staff member with existing bookings');
        return;
      }

      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) {
        console.error('Error deleting staff:', error);
        toast.error('Failed to delete staff member');
        return;
      }

      toast.success('Staff member deleted successfully');
      setDeletingStaffId(null);
      fetchStaff();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete staff member');
    }
  };

  const startEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setEditStaffName(staffMember.name);
  };

  const cancelEdit = () => {
    setEditingStaff(null);
    setEditStaffName('');
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Manage Staff</SheetTitle>
            <SheetDescription>
              Add, edit, or remove staff members for your shop.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Add Staff Section */}
            <div className="space-y-3">
              <Label htmlFor="new-staff-name">Add New Staff Member</Label>
              <div className="flex space-x-2">
                <Input
                  id="new-staff-name"
                  placeholder="Enter staff name"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStaff()}
                />
                <Button onClick={handleAddStaff} disabled={!newStaffName.trim()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Staff List */}
            <div className="space-y-3">
              <Label>Current Staff Members</Label>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                </div>
              ) : staff.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No staff members added yet</p>
                  <p className="text-sm">Add your first staff member above</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {staff.map((staffMember) => (
                    <div
                      key={staffMember.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      {editingStaff?.id === staffMember.id ? (
                        <div className="flex-1 flex items-center space-x-2">
                          <Input
                            value={editStaffName}
                            onChange={(e) => setEditStaffName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleUpdateStaff()}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={handleUpdateStaff}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium">{staffMember.name}</span>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(staffMember)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingStaffId(staffMember.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingStaffId} 
        onOpenChange={() => setDeletingStaffId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this staff member? This action cannot be undone.
              Staff members with existing bookings cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStaffId && handleDeleteStaff(deletingStaffId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StaffManagementSheet;
