
CREATE OR REPLACE FUNCTION public.get_available_slots(p_merchant_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid, p_service_duration integer DEFAULT 30)
 RETURNS TABLE(staff_id uuid, staff_name text, time_slot time without time zone, is_shop_holiday boolean, is_stylist_holiday boolean, shop_holiday_reason text, stylist_holiday_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_time_threshold TIME;
  current_date_check DATE;
  buffer_minutes INTEGER := 30;
BEGIN
  current_date_check := CURRENT_DATE;
  
  IF p_date = current_date_check THEN
    current_time_threshold := (CURRENT_TIME + (buffer_minutes || ' minutes')::INTERVAL)::TIME;
  ELSE
    current_time_threshold := '00:00:00'::TIME;
  END IF;

  RETURN QUERY
  SELECT 
    s.id as staff_id,
    s.name as staff_name,
    sts.time_slot,
    CASE WHEN sh.id IS NOT NULL THEN true ELSE false END as is_shop_holiday,
    CASE WHEN sth.id IS NOT NULL THEN true ELSE false END as is_stylist_holiday,
    sh.description as shop_holiday_reason,
    sth.description as stylist_holiday_reason
  FROM public.staff s
  INNER JOIN public.stylist_time_slots sts ON s.id = sts.staff_id 
    AND sts.date = p_date 
    AND sts.is_available = true
    AND (
      p_date > current_date_check OR 
      (p_date = current_date_check AND sts.time_slot >= current_time_threshold)
    )
  LEFT JOIN public.shop_holidays sh ON s.merchant_id = sh.merchant_id 
    AND sh.holiday_date = p_date
  LEFT JOIN public.stylist_holidays sth ON s.id = sth.staff_id 
    AND sth.holiday_date = p_date
  -- Exclude blocked slots
  LEFT JOIN public.stylist_blocked_slots sbs ON s.id = sbs.staff_id 
    AND sbs.blocked_date = p_date 
    AND sbs.time_slot = sts.time_slot::text
  WHERE s.merchant_id = p_merchant_id
    AND (p_staff_id IS NULL OR s.id = p_staff_id)
    -- Only return slots that are not holidays and not blocked
    AND sh.id IS NULL 
    AND sth.id IS NULL
    AND sbs.id IS NULL  -- Exclude blocked slots
  ORDER BY s.name, sts.time_slot;
END;
$function$
