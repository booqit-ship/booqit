
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Secure with an admin secret (for cron/secure CLI)
  const adminSecret = Deno.env.get('ADMIN_EDGE_SECRET');
  const reqSecret = req.headers.get('X-Admin-Secret');
  if (adminSecret && reqSecret !== adminSecret) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Find all due and unsent queue items
  const now = new Date().toISOString();
  const { data: queueItems, error: fetchError } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(25); // Batch size

  if (fetchError) {
    console.error('Failed to fetch notification_queue:', fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), { headers: corsHeaders });
  }

  let results = [];
  for (const item of queueItems || []) {
    try {
      // Find the target user's FCM token/profile
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('fcm_token, notification_enabled')
        .eq('id', item.user_id)
        .single();

      if (profErr || !profile?.fcm_token || profile.notification_enabled === false) {
        await supabase.from('notification_queue')
          .update({ status: 'failed', error_message: 'No FCM token or notifications disabled', sent_at: new Date().toISOString() })
          .eq('id', item.id);
        continue;
      }

      // Call the send-notification function for this item
      const invokeRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          userId: item.user_id,
          title: item.title,
          body: item.body,
          data: item.data
        })
      });

      if (!invokeRes.ok) {
        const errTxt = await invokeRes.text();
        await supabase.from('notification_queue')
          .update({ status: 'failed', error_message: errTxt, sent_at: new Date().toISOString() })
          .eq('id', item.id);
        results.push({ id: item.id, result: 'invoke_error', detail: errTxt });
        continue;
      } else {
        await supabase.from('notification_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id);
        results.push({ id: item.id, result: 'sent' });
      }
    } catch (err) {
      await supabase.from('notification_queue').update({
        status: 'failed',
        error_message: err.message,
        sent_at: new Date().toISOString()
      }).eq('id', item.id);
      results.push({ id: item.id, result: 'error', detail: err.message });
    }
  }

  return new Response(JSON.stringify({ sent: results }), { headers: corsHeaders });
});
