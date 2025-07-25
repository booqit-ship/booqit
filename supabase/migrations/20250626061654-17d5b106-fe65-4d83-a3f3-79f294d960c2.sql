
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.resolve_shop_slug(text);

-- First, let's check if the trigger exists and recreate it properly
DROP TRIGGER IF EXISTS trigger_update_shop_slug ON public.merchants;
DROP FUNCTION IF EXISTS public.update_shop_slug_on_name_change();

-- Create the trigger function to auto-update shop slugs when shop name changes
CREATE OR REPLACE FUNCTION public.update_shop_slug_on_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug TEXT;
BEGIN
  -- Only update if shop_name has actually changed
  IF OLD.shop_name IS DISTINCT FROM NEW.shop_name THEN
    -- Generate new slug
    new_slug := public.generate_shop_slug(NEW.shop_name);
    
    -- Update the shop_urls table
    UPDATE public.shop_urls 
    SET shop_slug = new_slug,
        updated_at = now()
    WHERE merchant_id = NEW.id;
    
    RAISE LOG 'Updated shop slug from % to % for merchant %', 
      (SELECT shop_slug FROM public.shop_urls WHERE merchant_id = NEW.id LIMIT 1),
      new_slug, 
      NEW.shop_name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_update_shop_slug
  AFTER UPDATE ON public.merchants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shop_slug_on_name_change();

-- Manually update the current "blooms" slug to "bloomes" to match the shop name
UPDATE public.shop_urls 
SET shop_slug = 'bloomes',
    updated_at = now()
WHERE shop_slug = 'blooms';

-- Create the resolve_shop_slug function with the correct structure
CREATE OR REPLACE FUNCTION public.resolve_shop_slug(p_shop_slug TEXT)
RETURNS TABLE(
  success BOOLEAN,
  merchant_id UUID,
  shop_name TEXT,
  category TEXT,
  address TEXT,
  image_url TEXT,
  open_time TIME,
  close_time TIME,
  rating DOUBLE PRECISION,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as success,
    m.id as merchant_id,
    m.shop_name,
    m.category,
    m.address,
    m.image_url,
    m.open_time,
    m.close_time,
    m.rating,
    m.description
  FROM public.shop_urls su
  JOIN public.merchants m ON su.merchant_id = m.id
  WHERE su.shop_slug = p_shop_slug 
    AND su.is_active = true
  LIMIT 1;
  
  -- If no results found, return failure
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIME, NULL::TIME, NULL::DOUBLE PRECISION, NULL::TEXT;
  END IF;
END;
$$;
