
-- Add type field to services table for gender-based filtering
ALTER TABLE public.services 
ADD COLUMN type text DEFAULT 'unisex';

-- Add a check constraint to ensure valid values
ALTER TABLE public.services 
ADD CONSTRAINT services_type_check 
CHECK (type IN ('male', 'female', 'unisex'));

-- Add comment to explain the field
COMMENT ON COLUMN public.services.type IS 'Gender type for service - male, female, or unisex';
