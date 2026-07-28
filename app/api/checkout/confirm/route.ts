import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { dbEventToEventData, type DbEvent } from '@/lib/events';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendEventConfirmationEmails } from '@/app/api/checkout/event/route';
import { sendMerchOrderConfirmation } from '@/lib/merch-email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

/**
 * GET /api/checkout/confirm?session_id=cs_xxx
 *
 * Called by the success page after Stripe redirects back.
 * - For merch orders: marks discount code as used.
 * - For event orders: sends confirmation emails (buyer + admin) with QR code.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const meta = session.metadata ?? {};

    // ── Event order ───────────────────────────────────────────────────────────
    if (meta.type === 'event') {
      // Resolve event from Supabase
      let event;
      let referralEnabled = false;
      try {
        const supabaseAdmin = getSupabaseAdmin();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabaseAdmin as any)
          .from('events').select('*').eq('slug', meta.event_slug).single();
        if (data) {
          event = dbEventToEventData(data as DbEvent);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          referralEnabled = !!(data as any).referral_enabled;
        }
      } catch {/* ignore */}
      if (!event) {
        return NextResponse.json({ error: 'Event not found in metadata' }, { status: 400 });
      }

      const qty   = parseInt(meta.ticket_count, 10) || 1;
      const total = event.price * qty;

      const metaConsentMarketing = meta.consent_marketing === 'true';
      await sendEventConfirmationEmails({
        orderId:     meta.order_id,
        event,
        firstName:   meta.buyer_first_name,
        lastName:    meta.buyer_last_name,
        email:       meta.buyer_email,
        phone:       meta.buyer_phone,
        qty,
        total,
        partnerCode: meta.partner_code || undefined,
        consentPrivacyAcceptedAt:   meta.consent_privacy_at,
        consentPrivacyVersion:      meta.consent_privacy_version,
        consentTermsAcceptedAt:     meta.consent_terms_at,
        consentTermsVersion:        meta.consent_terms_version,
        consentMarketing:           metaConsentMarketing,
        consentMarketingAcceptedAt: metaConsentMarketing ? meta.consent_privacy_at : null,
        consentPhotoVideo:          meta.consent_photo_video === 'true',
        consentIp:                  meta.consent_ip || null,
      });

      // Track upsell conversions (non-fatal)
      try {
        const upsellRaw = meta.upsell_items;
        if (upsellRaw) {
          const upsellItemsParsed = JSON.parse(upsellRaw) as { configId: string; title: string; price: number }[];
          const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          for (const item of upsellItemsParsed) {
            await db.from('upsell_analytics').insert({
              upsell_config_id: item.configId,
              event_type:       'converted',
              checkout_context: meta.event_slug,
              order_id:         meta.order_id,
            });
          }
        }
      } catch { /* non-fatal */ }

      // Referral attribution for paid events (non-blocking)
      if (meta.ref_code) {
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vivowineclub.com'}/api/referral/use`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            ref_code:      meta.ref_code,
            used_by_email: meta.buyer_email.toLowerCase(),
            event_slug:    meta.event_slug,
          }),
        }).catch(() => {/* non-fatal */});
      }

      return NextResponse.json({
        ok:               true,
        type:             'event',
        order_id:         meta.order_id,
        buyer_email:      meta.buyer_email,
        buyer_name:       `${meta.buyer_first_name} ${meta.buyer_last_name}`.trim(),
        referral_enabled: referralEnabled,
        event: {
          title:        event.title,
          month:        event.month,
          day:          event.day,
          year:         event.year,
          time:         event.time ?? null,
          locationFull: event.locationFull,
          slug:         event.slug,
          qty,
        },
      });
    }

    // ── Merch order — mark discount code as used + save to merch_orders ─────────
    const code = meta.discount_code;
    if (code) {
      await supabase
        .from('discount_codes')
        .update({ used: true })
        .eq('code', code)
        .eq('used', false);
    }

    // Persist order for admin panel (idempotent via stripe_session_id UNIQUE)
    try {
      const sessionWithItems = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items'],
      });
      const lineItems = sessionWithItems.line_items?.data ?? [];
      const items = lineItems.map((li) => ({
        name:  (li.description ?? '').replace(/\s*\([−\-]\d+%\)$/, '').trim(),
        qty:   li.quantity ?? 1,
        price: li.amount_subtotal != null ? li.amount_subtotal / li.quantity! / 100 : 0,
      }));
      const total = (sessionWithItems.amount_total ?? 0) / 100;
      const customerName  = sessionWithItems.customer_details?.name  ?? null;
      const customerEmail = sessionWithItems.customer_details?.email ?? null;

      // Extract shipping address and phone from Stripe
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionAny   = sessionWithItems as any;
      const shipping     = sessionAny.shipping_details?.address ?? sessionWithItems.customer_details?.address ?? null;
      const phone        = sessionWithItems.customer_details?.phone ?? null;
      // Extract delivery notes (custom field)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deliveryNotesField = ((sessionWithItems as any).custom_fields ?? [])
        .find((f: { key: string; text?: { value?: string | null } }) => f.key === 'delivery_notes');
      const deliveryNotes = deliveryNotesField?.text?.value ?? null;

      const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      await db.from('merch_orders').upsert({
        stripe_session_id: sessionId,
        customer_name:     customerName,
        customer_email:    customerEmail,
        items,
        total,
        status:            'da_evadere',
        created_at:        new Date(sessionWithItems.created * 1000).toISOString(),
        shipping_line1:    shipping?.line1   ?? null,
        shipping_line2:    shipping?.line2   ?? null,
        shipping_city:     shipping?.city    ?? null,
        shipping_postal:   shipping?.postal_code ?? null,
        shipping_state:    shipping?.state   ?? null,
        shipping_country:  shipping?.country ?? null,
        phone,
        delivery_notes:    deliveryNotes,
        consent_privacy_accepted_at: meta.consent_privacy_at || null,
        consent_privacy_version:     meta.consent_privacy_version || null,
        consent_terms_accepted_at:   meta.consent_terms_at || null,
        consent_terms_version:       meta.consent_terms_version || null,
        consent_ip:                  meta.consent_ip || null,
      }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });

      // Decrement stock for each purchased item (atomic check + decrement)
      try {
        const stockAdjs: { product_id: string; variant_id: string | null; size: string | null; qty: number }[] =
          JSON.parse(meta.stock_adjustments || '[]');
        for (const adj of stockAdjs) {
          const { data: ok } = await db.rpc('check_and_decrement_stock', {
            p_product_id: adj.product_id,
            p_variant_id: adj.variant_id,
            p_size:       adj.size,
            p_qty:        adj.qty,
          });
          if (!ok) {
            // Oversell detected — log it but don't fail (payment already confirmed)
            await db.from('stock_audit_log').insert({
              product_id: adj.product_id,
              variant_id: adj.variant_id ?? null,
              size:       adj.size       ?? null,
              old_qty:    0,
              new_qty:    0,
              reason:     'oversell',
              changed_by: 'stripe_webhook',
            }).catch(() => {});
          }
        }
      } catch (stockErr) {
        console.error('[confirm] stock decrement error (non-fatal):', stockErr);
      }

      // Send order confirmation email
      if (customerEmail) {
        try {
          await sendMerchOrderConfirmation({
            to:    customerEmail,
            name:  customerName,
            items,
            total,
          });
        } catch (emailErr) {
          console.error('[confirm] merch confirmation email error (non-fatal):', emailErr);
        }
      }
    } catch (orderErr) {
      console.error('[confirm] merch_orders upsert error (non-fatal):', orderErr);
    }

    return NextResponse.json({ ok: true, type: 'merch', discount_code: code ?? null });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
  }
}
