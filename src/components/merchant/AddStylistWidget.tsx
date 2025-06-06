
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, User, Mail, Phone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddStylistWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; phone: string }) => void;
  isSubmitting?: boolean;
}

const AddStylistWidget: React.FC<AddStylistWidgetProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email, phone });
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />
      
      {/* Widget */}
      <div className={cn(
        "fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto transition-all duration-300 ease-out",
        "md:inset-x-auto md:right-8 md:top-1/2 md:-translate-y-1/2 md:left-auto",
        isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
      )}>
        <Card className="shadow-2xl border-0 overflow-hidden bg-white">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-booqit-teal to-booqit-teal/90 text-white relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Add New Stylist
                  </CardTitle>
                  <p className="text-white/80 text-sm">
                    Add a team member to your business
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Stylist Name */}
              <div className="space-y-2">
                <Label htmlFor="stylist-name" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-booqit-teal" />
                  Full Name
                </Label>
                <Input
                  id="stylist-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="border-gray-300 focus:border-booqit-teal focus:ring-booqit-teal/20"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="stylist-email" className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Email Address
                </Label>
                <Input
                  id="stylist-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="border-gray-300 focus:border-booqit-teal focus:ring-booqit-teal/20"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="stylist-phone" className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4 text-green-600" />
                  Phone Number
                </Label>
                <Input
                  id="stylist-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="border-gray-300 focus:border-booqit-teal focus:ring-booqit-teal/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-gray-300 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-booqit-teal hover:bg-booqit-teal/90 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Stylist
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AddStylistWidget;
