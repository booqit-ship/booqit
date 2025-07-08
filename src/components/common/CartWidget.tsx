
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ShoppingCart, X, Clock } from 'lucide-react';
import { Service } from '@/types';

interface CartWidgetProps {
  selectedServices: Service[];
  onRemoveService?: (service: Service) => void;
  totalPrice: number;
  totalDuration: number;
}

const CartWidget: React.FC<CartWidgetProps> = ({
  selectedServices,
  onRemoveService,
  totalPrice,
  totalDuration
}) => {
  if (selectedServices.length === 0) return null;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative bg-white border-2 border-booqit-primary text-booqit-primary hover:bg-booqit-primary/10 shadow-lg min-w-[44px] h-[44px] p-2"
        >
          <ShoppingCart className="h-4 w-4" />
          <Badge 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs font-bold"
          >
            {selectedServices.length}
          </Badge>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Selected Services ({selectedServices.length})
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-3 mb-6">
            {selectedServices.map((service) => (
              <Card key={service.id} className="border border-booqit-primary/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1">{service.name}</h4>
                      {service.description && (
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      )}
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{service.duration} mins</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-semibold text-booqit-primary">₹{service.price}</span>
                      {onRemoveService && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveService(service)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Summary */}
          <Card className="bg-gradient-to-r from-booqit-primary/10 to-booqit-primary/5 border-booqit-primary/30">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Services:</span>
                  <span className="font-medium">{selectedServices.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Duration:</span>
                  <span className="font-medium">{totalDuration} mins</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-lg pt-2 border-t border-booqit-primary/20">
                  <span>Total Amount:</span>
                  <span className="text-booqit-primary">₹{totalPrice}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CartWidget;
