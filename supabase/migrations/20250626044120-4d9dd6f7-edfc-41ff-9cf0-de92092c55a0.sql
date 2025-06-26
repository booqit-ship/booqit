
-- Create shop_urls table for custom booking URLs
CREATE TABLE IF NOT EXISTS public.shop_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  shop_slug TEXT NOT NULL UNIQUE,
  custom_domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for shop_urls
ALTER TABLE public.shop_urls ENABLE ROW LEVEL SECURITY;

-- Allow public read access for shop URLs (needed for guest bookings)
CREATE POLICY "Allow public read access to shop URLs" 
  ON public.shop_urls 
  FOR SELECT 
  USING (is_active = true);

-- Allow merchants to manage their own shop URLs
CREATE POLICY "Allow merchants to manage their shop URLs" 
  ON public.shop_urls 
  FOR ALL 
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
  );

-- Function to generate shop slug from shop name
CREATE OR REPLACE FUNCTION public.generate_shop_slug(shop_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  base_slug := lower(regexp_replace(
    regexp_replace(shop_name, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  -- Remove leading/trailing hyphens
  base_slug := trim(base_slug, '-');
  
  final_slug := base_slug;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.shop_urls WHERE shop_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Function to resolve shop slug to merchant info
CREATE OR REPLACE FUNCTION public.resolve_shop_slug(p_shop_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  merchant_record RECORD;
BEGIN
  SELECT m.id, m.shop_name, m.category, m.address, m.image_url
  INTO merchant_record
  FROM public.merchants m
  JOIN public.shop_urls su ON m.id = su.merchant_id
  WHERE su.shop_slug = p_shop_slug AND su.is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Shop not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'merchant', json_build_object(
      'id', merchant_record.id,
      'shop_name', merchant_record.shop_name,
      'category', merchant_record.category,
      'address', merchant_record.address,
      'image_url', merchant_record.image_url
    )
  );
END;
$$;

-- Populate existing merchants with shop URLs
INSERT INTO public.shop_urls (merchant_id, shop_slug)
SELECT 
  id,
  public.generate_shop_slug(shop_name)
FROM public.merchants
ON CONFLICT (shop_slug) DO NOTHING;
