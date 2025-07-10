import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, Loader2, Edit, Trash2, Save, Plus } from 'lucide-react';
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
  name: string;
  services: ExtractedService[];
}

interface AIServiceExtractorProps {
  merchantId: string;
  onServicesAdded: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const AIServiceExtractor: React.FC<AIServiceExtractorProps> = ({
  merchantId,
  onServicesAdded,
  isOpen,
  onClose
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedCategory[]>([]);
  const [editingServices, setEditingServices] = useState<ExtractedService[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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
• Time → Leave the time field blank. The merchant will fill it in manually later.

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
          "duration": ""
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.`;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive"
      });
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractServicesWithAI = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    
    try {
      const base64Image = await convertFileToBase64(selectedFile);
      
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
                  mime_type: selectedFile.type,
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
      
      // Parse the JSON response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Convert to our format and add IDs
      const categoriesWithIds = parsedData.categories.map((cat: any) => ({
        name: cat.name,
        services: cat.services.map((service: any, index: number) => ({
          id: `temp-${Date.now()}-${index}`,
          name: service.name,
          price: service.price.toString().replace(/[^0-9]/g, ''), // Extract only numbers
          gender: service.gender || 'Unisex',
          duration: '',
          category: cat.name
        }))
      }));

      setExtractedData(categoriesWithIds);
      
      // Flatten services for editing
      const allServices = categoriesWithIds.flatMap((cat: ExtractedCategory) => cat.services);
      setEditingServices(allServices);

      toast({
        title: "Services extracted successfully!",
        description: `Found ${allServices.length} services. Please review and add time durations.`
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

  const updateService = (serviceId: string, field: string, value: string) => {
    setEditingServices(prev => prev.map(service => 
      service.id === serviceId 
        ? { ...service, [field]: value }
        : service
    ));
  };

  const removeService = (serviceId: string) => {
    setEditingServices(prev => prev.filter(service => service.id !== serviceId));
  };

  const addNewService = () => {
    const newService: ExtractedService = {
      id: `new-${Date.now()}`,
      name: '',
      price: '',
      gender: 'Unisex',
      duration: '',
      category: 'General'
    };
    setEditingServices(prev => [...prev, newService]);
  };

  const validateAndSaveServices = async () => {
    // Validate all services have required fields
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
      // Save services to database
      for (const service of editingServices) {
        const { error } = await supabase
          .from('services')
          .insert({
            merchant_id: merchantId,
            name: service.name.trim(),
            price: parseInt(service.price),
            duration: parseInt(service.duration),
            type: service.gender,
            description: `Extracted from menu - ${service.category}`
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
    setSelectedFile(null);
    setExtractedData([]);
    setEditingServices([]);
    onClose();
  };

  const groupedServices = editingServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, ExtractedService[]>);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Extract Services with AI
          </DialogTitle>
          <DialogDescription>
            Upload an image of your salon menu and let AI extract all services automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          {!extractedData.length && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Menu Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
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
                        {selectedFile ? selectedFile.name : "Click to upload your menu image"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports JPG, PNG, WebP formats
                      </p>
                    </div>
                  </label>
                </div>

                <Button
                  onClick={extractServicesWithAI}
                  disabled={!selectedFile || isExtracting}
                  className="w-full"
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
          {extractedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Review & Edit Services ({editingServices.length})</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addNewService}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Service
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(groupedServices).map(([category, services]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">
                        {category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {services.length} services
                      </span>
                    </div>

                    <div className="space-y-3">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className="p-4 border rounded-lg space-y-3"
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
                              />
                            </div>

                            <div>
                              <Label htmlFor={`gender-${service.id}`}>Gender</Label>
                              <Select
                                value={service.gender}
                                onValueChange={(value) => updateService(service.id, 'gender', value)}
                              >
                                <SelectTrigger>
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
                    className="w-full"
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
      </DialogContent>
    </Dialog>
  );
};

export default AIServiceExtractor;