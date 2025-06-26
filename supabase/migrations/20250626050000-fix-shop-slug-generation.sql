
-- Fix the shop slug generation function to preserve shop names better
CREATE OR REPLACE FUNCTION public.generate_shop_slug(shop_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Convert to lowercase and handle special characters better
  -- Replace accented characters with their base equivalents
  base_slug := lower(
    translate(
      shop_name,
      'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ',
      'aaaaaaaceeeeiiiidnooooooouuuuyty'
    )
  );
  
  -- Replace spaces and remaining special chars with hyphens
  base_slug := regexp_replace(base_slug, '[^a-z0-9]', '-', 'g');
  
  -- Remove multiple consecutive hyphens
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  
  -- Remove leading/trailing hyphens
  base_slug := trim(base_slug, '-');
  
  -- Ensure we have something
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'shop';
  END IF;
  
  final_slug := base_slug;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.shop_urls WHERE shop_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update existing incorrect slugs
UPDATE public.shop_urls 
SET shop_slug = public.generate_shop_slug(m.shop_name),
    updated_at = now()
FROM public.merchants m 
WHERE shop_urls.merchant_id = m.id
AND shop_urls.shop_slug != public.generate_shop_slug(m.shop_name);
