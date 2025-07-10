import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, Loader2, Edit, Trash2, Save, Plus, X, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedService {
  id: string;
  name: string;
  price: string;
  gender: string;
  duration: string;
  category: string;
}

interface ExtractedCategory {
  id: string;
  name: string;
  color: string;
  services: ExtractedService[];
}

interface AIServiceExtractorProps {
  merchantId: string;
  onServicesAdded: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

const AIServiceExtractor: React.FC<AIServiceExtractorProps> = ({
  merchantId,
  onServicesAdded,
  isOpen = false,
  onClose,
  isEmbedded = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedCategories, setExtractedCategories] = useState<ExtractedCategory[]>([]);
  const [editingServices, setEditingServices] = useState<ExtractedService[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { toast } = useToast();

  const GEMINI_API_KEY = 'AIzaSyAeycUlj481zIG6XKACW6gNjYqD_uY3LIE';
  
  const EXTRACTION_PROMPT = `You are an AI assistant helping merchants on a salon booking platform in India called Booqit.

A merchant is uploading an image of their salon's service menu. Your job is to extract all the services from this image and present them in a clean, editable, structured format that will be displayed inside a mobile-responsive web application.

Here's what you must do:

🔹 1. Extract Categories:
Group the services into correct categories such as:
- Hair Services
- Facial
- Waxing
- Massage
- Make-Up
- Hair Styling
- Any other clear groupings seen in the image

Each service should belong to one of these categories. If no category is given in the image, infer it from context.

🔹 2. For Each Service, Extract:
• Service Name (e.g., "Hair Cut", "Gold Facial")
• Price → Convert to Indian Rupees (₹). If the price in the image is in another currency (e.g., dollars), just extract the number and replace the prefix with ₹. (Example: "$25" becomes "₹25")
• Gender → Detect from the service name if possible. Use "Men", "Women", or "Unisex". If gender is not clearly stated, use "Unisex".
• Time → If time duration is mentioned in the image, extract it in minutes. If not mentioned, calculate an approximate time based on the service type:
  - Hair Cut: 30 minutes
  - Hair Wash: 15 minutes  
  - Hair Styling: 45 minutes
  - Facial: 60 minutes
  - Massage: 60 minutes
  - Waxing: 30 minutes
  - Manicure: 45 minutes
  - Pedicure: 60 minutes
  - Eyebrow Threading: 15 minutes
  - Hair Color: 120 minutes
  Use your best judgment for other services.

🔹 3. Do NOT Include:
- Contact details (e.g., phone numbers, emails)
- Brand names (e.g., L'Oréal, Matrix)
- Decorative headings like "Special Offers", "Welcome"
- Any irrelevant text or watermarks

🔹 4. Output Format:
Return a valid JSON object with this exact structure:

{
  "categories": [
    {
      "name": "Hair Services",
      "services": [
        {
          "name": "Hair Cut",
          "price": "200",
          "gender": "Unisex",
          "duration": "30"
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.`;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Please select only image files.",
        variant: "destructive"
      });
    }
    
    if (imageFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...imageFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractServicesWithAI = async () => {
    if (!selectedFiles.length) return;

    setIsExtracting(true);
    
    try {
      let allExtractedData: ExtractedCategory[] = [];
      
      for (const file of selectedFiles) {
        const base64Image = await convertFileToBase64(file);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: EXTRACTION_PROMPT },
                {
                  inline_data: {
                    mime_type: file.type,
                    data: base64Image
                  }
                }
              ]
            }]
          })
        });

        if (!response.ok) {
          throw new Error('Failed to extract services');
        }

        const result = await response.json();
        const extractedText = result.candidates[0].content.parts[0].text;
        
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid AI response format');
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Convert to our format and add IDs
        const categoriesWithIds = parsedData.categories.map((cat: any) => ({
          id: `cat-${Date.now()}-${Math.random()}`,
          name: cat.name,
          color: getRandomColor(),
          services: cat.services.map((service: any, index: number) => ({
            id: `service-${Date.now()}-${index}-${Math.random()}`,
            name: service.name,
            price: service.price.toString().replace(/[^0-9]/g, ''),
            gender: service.gender || 'Unisex',
            duration: service.duration || '30',
            category: cat.name
          }))
        }));

        allExtractedData = [...allExtractedData, ...categoriesWithIds];
      }

      // Merge categories with same names
      const mergedCategories = mergeCategories(allExtractedData);
      setExtractedCategories(mergedCategories);
      
      // Flatten services for editing
      const allServices = mergedCategories.flatMap((cat: ExtractedCategory) => cat.services);
      setEditingServices(allServices);

      toast({
        title: "Services extracted successfully!",
        description: `Found ${allServices.length} services across ${mergedCategories.length} categories.`
      });

    } catch (error) {
      console.error('Error extracting services:', error);
      toast({
        title: "Extraction failed",
        description: "Please try again or check your image quality.",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const getRandomColor = () => {
    const colors = ['#7E57C2', '#E91E63', '#FF9800', '#4CAF50', '#2196F3', '#FF5722', '#795548', '#607D8B'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const mergeCategories = (categories: ExtractedCategory[]) => {
    const merged: { [key: string]: ExtractedCategory } = {};
    
    categories.forEach(cat => {
      if (merged[cat.name]) {
        merged[cat.name].services = [...merged[cat.name].services, ...cat.services];
      } else {
        merged[cat.name] = cat;
      }
    });
    
    return Object.values(merged);
  };

  const updateService = (serviceId: string, field: string, value: string) => {
    setEditingServices(prev => prev.map(service => 
      service.id === serviceId 
        ? { ...service, [field]: value }
        : service
    ));
    
    // Also update in categories
    setExtractedCategories(prev => prev.map(cat => ({
      ...cat,
      services: cat.services.map(service =>
        service.id === serviceId
          ? { ...service, [field]: value }
          : service
      )
    })));
  };

  const removeService = (serviceId: string) => {
    setEditingServices(prev => prev.filter(service => service.id !== serviceId));
    setExtractedCategories(prev => prev.map(cat => ({
      ...cat,
      services: cat.services.filter(service => service.id !== serviceId)
    })));
  };

  const addNewService = (categoryName: string) => {
    const newService: ExtractedService = {
      id: `new-${Date.now()}-${Math.random()}`,
      name: '',
      price: '',
      gender: 'Unisex',
      duration: '30',
      category: categoryName
    };
    setEditingServices(prev => [...prev, newService]);
    
    setExtractedCategories(prev => prev.map(cat => 
      cat.name === categoryName 
        ? { ...cat, services: [...cat.services, newService] }
        : cat
    ));
  };

  const addNewCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory: ExtractedCategory = {
      id: `cat-new-${Date.now()}-${Math.random()}`,
      name: newCategoryName.trim(),
      color: getRandomColor(),
      services: []
    };
    
    setExtractedCategories(prev => [...prev, newCategory]);
    setNewCategoryName('');
    setEditingCategory(null);
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    setExtractedCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, name: newName }
        : cat
    ));
    
    // Update services that belong to this category
    setEditingServices(prev => prev.map(service => 
      service.category === extractedCategories.find(c => c.id === categoryId)?.name
        ? { ...service, category: newName }
        : service
    ));
  };

  const removeCategory = (categoryId: string) => {
    const category = extractedCategories.find(c => c.id === categoryId);
    if (!category) return;
    
    // Remove all services in this category
    setEditingServices(prev => prev.filter(service => service.category !== category.name));
    setExtractedCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const validateAndSaveServices = async () => {
    const invalidServices = editingServices.filter(service => 
      !service.name.trim() || !service.price.trim() || !service.duration.trim()
    );

    if (invalidServices.length > 0) {
      toast({
        title: "Missing required fields",
        description: "Please fill in name, price, and time duration for all services.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // First, save categories to database
      const categoriesToSave = extractedCategories.filter(cat => cat.services.length > 0);
      const savedCategoryIds: { [key: string]: string } = {};

      for (const category of categoriesToSave) {
        const { data, error } = await supabase
          .from('service_categories')
          .insert({
            merchant_id: merchantId,
            name: category.name,
            color: category.color
          })
          .select()
          .single();

        if (error) {
          // If category already exists, fetch it
          const { data: existingCategory } = await supabase
            .from('service_categories')
            .select('id')
            .eq('merchant_id', merchantId)
            .eq('name', category.name)
            .single();
          
          if (existingCategory) {
            savedCategoryIds[category.name] = existingCategory.id;
          }
        } else {
          savedCategoryIds[category.name] = data.id;
        }
      }

      // Save services to database
      for (const service of editingServices) {
        const categoryId = savedCategoryIds[service.category];
        
        const { error } = await supabase
          .from('services')
          .insert({
            merchant_id: merchantId,
            name: service.name.trim(),
            price: parseInt(service.price),
            duration: parseInt(service.duration),
            type: service.gender.toLowerCase(),
            description: `Extracted from menu - ${service.category}`,
            categories: categoryId ? [categoryId] : []
          });

        if (error) throw error;
      }

      toast({
        title: "Services added successfully!",
        description: `${editingServices.length} services have been added to your menu.`
      });

      onServicesAdded();
      handleClose();

    } catch (error) {
      console.error('Error saving services:', error);
      toast({
        title: "Failed to save services",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setExtractedCategories([]);
    setEditingServices([]);
    setEditingCategory(null);
    setNewCategoryName('');
    if (onClose) onClose();
  };

  const content = (
    <div className="space-y-6">
      {/* File Upload Section */}
      {!extractedCategories.length && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Upload Menu Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Preview Grid */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group animate-scale-in">
                    <div className="aspect-square rounded-lg bg-muted overflow-hidden border-2 border-dashed border-muted-foreground/25">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Menu ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-booqit-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="menu-upload"
              />
              <label
                htmlFor="menu-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Click to upload menu images
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Select multiple images • JPG, PNG, WebP formats
                  </p>
                </div>
              </label>
            </div>

            <Button
              onClick={extractServicesWithAI}
              disabled={!selectedFiles.length || isExtracting}
              className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Services...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Extract Services with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Extracted Services Editor */}
      {extractedCategories.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Review & Edit Services ({editingServices.length})</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategory('new')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Category
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Category Form */}
            {editingCategory === 'new' && (
              <Card className="border-booqit-primary/20 animate-scale-in">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      className="flex-1"
                    />
                    <Button onClick={addNewCategory} size="sm">
                      Add
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {extractedCategories.map((category) => (
              <div key={category.id} className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    {editingCategory === category.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={category.name}
                          onChange={(e) => updateCategoryName(category.id, e.target.value)}
                          className="w-40"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => setEditingCategory(null)}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-sm">
                          {category.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {category.services.length} services
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCategory(category.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addNewService(category.name)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCategory(category.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {category.services.map((service) => (
                    <div
                      key={service.id}
                      className="p-4 border rounded-lg space-y-3 animate-scale-in hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Service Details</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(service.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`name-${service.id}`}>Service Name *</Label>
                          <Input
                            id={`name-${service.id}`}
                            value={service.name}
                            onChange={(e) => updateService(service.id, 'name', e.target.value)}
                            placeholder="Enter service name"
                            className="border-booqit-primary/20 focus:border-booqit-primary"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`price-${service.id}`}>Price (₹) *</Label>
                          <Input
                            id={`price-${service.id}`}
                            type="number"
                            value={service.price}
                            onChange={(e) => updateService(service.id, 'price', e.target.value)}
                            placeholder="Enter price"
                            className="border-booqit-primary/20 focus:border-booqit-primary"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`gender-${service.id}`}>Gender</Label>
                          <Select
                            value={service.gender}
                            onValueChange={(value) => updateService(service.id, 'gender', value)}
                          >
                            <SelectTrigger className="border-booqit-primary/20 focus:border-booqit-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Unisex">Unisex</SelectItem>
                              <SelectItem value="Men">Men</SelectItem>
                              <SelectItem value="Women">Women</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`duration-${service.id}`}>Duration (minutes) *</Label>
                          <Input
                            id={`duration-${service.id}`}
                            type="number"
                            value={service.duration}
                            onChange={(e) => updateService(service.id, 'duration', e.target.value)}
                            placeholder="Enter duration"
                            className="border-booqit-primary/20 focus:border-booqit-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t">
              <Button
                onClick={validateAndSaveServices}
                disabled={isSaving || editingServices.length === 0}
                className="w-full bg-booqit-primary hover:bg-booqit-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Services...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All Services ({editingServices.length})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Extract Services with AI
          </DialogTitle>
          <DialogDescription>
            Upload images of your salon menu and let AI extract all services automatically.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default AIServiceExtractor;