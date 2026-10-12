/**
 * v1263 — Brand-site email-gated download.
 *
 * The visitor's form (name, email, organisation, marketing opt-in) is posted here. The database
 * function public.site_record_gated_download (service role only, SQL v1263) validates it,
 * rate-limits it, records the lead in site_enquiries (topic 'download') and returns where the
 * private file is. This function then returns a 5-minute signed link from the private bucket
 * 'site-downloads'. The private path never reaches the browser.
 *
 * Public endpoint (anonymous visitors): called with the anon key; no user session is required.
 * Deploy: supabase functions deploy site-download
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const SIGNED_URL_SECONDS = 300
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** File name offered to the browser: the document's display name plus the stored file's extension. */
function downloadName(displayName: string, path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const base = String(displayName || 'download').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 120) || 'download'
  return ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Your request could not be read.' })
  }
  const attachmentId = String(body.attachmentId || '')
  if (!UUID_RE.test(attachmentId)) return json(400, { error: 'This document is not available.' })

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  const { data, error } = await supabase.rpc('site_record_gated_download', {
    p_attachment_id: attachmentId,
    p_full_name: String(body.fullName ?? '').slice(0, 200),
    p_email: String(body.email ?? '').slice(0, 254),
    p_organisation: body.organisation ? String(body.organisation).slice(0, 200) : null,
    p_marketing_opt_in: body.marketingOptIn === true,
    p_page_url: body.pageUrl ? String(body.pageUrl).slice(0, 500) : null,
    p_website: body.website ? String(body.website) : null,
  })
  // The SQL function raises visitor-safe messages (validation, rate limit, unavailable document).
  if (error || !data?.path) return json(400, { error: error?.message || 'This document is not available.' })

  const fileName = downloadName(data.display_name, data.path)
  const { data: signed, error: signError } = await supabase.storage
    .from(data.bucket)
    .createSignedUrl(data.path, SIGNED_URL_SECONDS, { download: fileName })
  if (signError || !signed?.signedUrl) {
    console.error('[site-download] signing failed:', signError?.message)
    return json(500, { error: 'The download could not be prepared. Please try again.' })
  }
  return json(200, { url: signed.signedUrl, fileName, reference: data.reference })
})
