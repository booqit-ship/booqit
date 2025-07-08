
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { Service } from '@/types';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface StructuredServicesListProps {
  services: Service[];
  categories: Category[];
  onServiceClick?: (service: Service) => void;
  selectedServices?: Service[];
  showSelection?: boolean;
  isSelectable?: boolean;
}

const StructuredServicesList: React.FC<StructuredServicesListProps> = ({
  services,
  categories,
  onServiceClick,
  selectedServices = [],
  showSelection = false,
  isSelectable = false
}) => {
  // Group services by category
  const groupedServices = React.useMemo(() => {
    const categorized: Record<string, { category: Category; services: Service[] }> = {};
    const uncategorized: Service[] = [];

    services.forEach(service => {
      if (service.categories && service.categories.length > 0) {
        service.categories.forEach(categoryId => {
          const category = categories.find(cat => cat.id === categoryId);
          if (category) {
            if (!categorized[categoryId]) {
              categorized[categoryId] = { category, services: [] };
            }
            categorized[categoryId].services.push(service);
          }
        });
      } else {
        uncategorized.push(service);
      }
    });

    return { categorized, uncategorized };
  }, [services, categories]);

  const isSelected = (service: Service) => {
    return selectedServices.some(s => s.id === service.id);
  };

  const renderServiceCard = (service: Service) => {
    const selected = isSelected(service);
    
    return (
      <div
        key={service.id}
        className={`ml-4 mb-3 ${isSelectable ? 'cursor-pointer' : ''}`}
        onClick={() => isSelectable && onServiceClick?.(service)}
      >
        <Card className={`border-l-4 transition-all ${
          selected ? 'border-l-booqit-primary bg-booqit-primary/5' : 'border-l-gray-200 hover:border-l-booqit-primary/50'
        }`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-gray-800">- {service.name}</h4>
                  {showSelection && (
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selected ? 'bg-booqit-primary border-booqit-primary' : 'border-gray-300'
                    }`}>
                      {selected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                )}
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{service.duration} mins</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-semibold text-booqit-primary">₹{service.price}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Categorized Services */}
      {Object.values(groupedServices.categorized).map(({ category, services: categoryServices }) => (
        <div key={category.id} className="space-y-2">
          <h3 
            className="text-lg font-semibold text-gray-800 uppercase tracking-wide border-b-2 pb-1"
            style={{ borderColor: category.color }}
          >
            {category.name}
          </h3>
          <div className="space-y-2">
            {categoryServices.map(renderServiceCard)}
          </div>
        </div>
      ))}

      {/* Uncategorized Services */}
      {groupedServices.uncategorized.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 uppercase tracking-wide border-b-2 border-gray-300 pb-1">
            OTHER SERVICES
          </h3>
          <div className="space-y-2">
            {groupedServices.uncategorized.map(renderServiceCard)}
          </div>
        </div>
      )}

      {services.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No services available</p>
        </div>
      )}
    </div>
  );
};

export default StructuredServicesList;
