
import React, { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, UserPlus, Edit, Trash, Users } from 'lucide-react';

interface StaffManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string | null;
}

const StaffManagementSheet: React.FC<StaffManagementSheetProps> = ({
  open,
  onOpenChange,
  merchantId
}) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();

  // Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      if (!merchantId || !open) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('merchant_id', merchantId)
          .order('name', { ascending: true });
          
        if (error) throw error;
        
        setStaffList(data as Staff[]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to fetch stylist data",
          variant: "destructive"
        });
        console.error('Error fetching staff:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaff();
  }, [merchantId, open]);

  const handleAddStaff = async () => {
    if (!merchantId || !newStaffName.trim()) {
      toast({
        title: "Error",
        description: "Stylist name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setIsAddingStaff(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert({
          merchant_id: merchantId,
          name: newStaffName.trim()
        })
        .select();
        
      if (error) throw error;
      
      setStaffList([...staffList, data[0] as Staff]);
      setNewStaffName('');
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Stylist added successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add stylist",
        variant: "destructive"
      });
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleEditStaff = async () => {
    if (!currentStaffId || !newStaffName.trim()) return;

    setIsAddingStaff(true);
    try {
      const { error } = await supabase
        .from('staff')
        .update({ name: newStaffName.trim() })
        .eq('id', currentStaffId);
        
      if (error) throw error;
      
      setStaffList(staffList.map(staff => 
        staff.id === currentStaffId ? { ...staff, name: newStaffName.trim() } : staff
      ));
      
      setNewStaffName('');
      setIsEditing(false);
      setCurrentStaffId(null);
      
      toast({
        title: "Success",
        description: "Stylist updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update stylist",
        variant: "destructive"
      });
    } finally {
      setIsAddingStaff(false);
    }
  };

  const startEdit = (staff: Staff) => {
    setNewStaffName(staff.name);
    setCurrentStaffId(staff.id);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setNewStaffName('');
    setCurrentStaffId(null);
    setIsEditing(false);
  };

  const openDeleteDialog = (staffId: string) => {
    setDeleteStaffId(staffId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaffId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', deleteStaffId);
        
      if (error) throw error;
      
      setStaffList(staffList.filter(staff => staff.id !== deleteStaffId));
      
      toast({
        title: "Success",
        description: "Stylist deleted successfully"
      });
      
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete stylist",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> 
              Manage Stylists
            </SheetTitle>
            <SheetDescription>
              Add, edit or remove stylists who work at your salon
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                isEditing ? handleEditStaff() : handleAddStaff();
              }}
              className="space-y-4"
            >
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="staffName">
                  {isEditing ? "Edit Stylist Name" : "Add New Stylist"}
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="staffName"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Enter stylist name"
                    className="flex-grow"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="bg-booqit-primary hover:bg-booqit-primary/90"
                    disabled={isAddingStaff || !newStaffName.trim()}
                  >
                    {isAddingStaff ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isEditing ? (
                      "Update"
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-4 w-4" />
                        Add
                      </>
                    )}
                  </Button>
                  {isEditing && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </form>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium text-booqit-dark/90 mb-3">Your Stylists</h3>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 text-booqit-primary animate-spin" />
                </div>
              ) : staffList.length === 0 ? (
                <div className="text-center py-8 px-4 border rounded-lg border-dashed border-gray-300">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No stylists added yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Add your first stylist to start managing your team</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {staffList.map(staff => (
                    <li 
                      key={staff.id} 
                      className="flex justify-between items-center p-3 rounded-md border border-gray-200 bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-booqit-dark">
                          {staff.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(staff)}
                          className="h-8 w-8 text-muted-foreground hover:bg-booqit-primary/10 hover:text-booqit-primary"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(staff.id)}
                          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
              >
                Done
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this stylist from your salon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteStaff}
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StaffManagementSheet;
