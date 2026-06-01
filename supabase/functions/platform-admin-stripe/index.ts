import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const EP_PARTNERS_ACCOUNT_ID = '67f66f7a-d9a8-455e-8820-ee836cfe7401';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY not configured' }, 500);
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Verify EP Partners membership
    const { data: isMember } = await supabase.rpc('is_account_member', {
      _user_id: user.id,
      _account_id: EP_PARTNERS_ACCOUNT_ID
    });
    if (!isMember) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Accept action from body (POST) or URL params (GET)
    let action: string | null = null;
    let body: Record<string, unknown> = {};
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      action = url.searchParams.get('action');
    } else {
      body = await req.json();
      action = (body.action as string) || null;
    }
    const method = req.method;

    if (action === 'list-products') {
      const products = await stripe.products.list({ limit: 100, active: true });
      const prices = await stripe.prices.list({ limit: 100, active: true, expand: ['data.product'] });

      return jsonResponse({
        products: products.data,
        prices: prices.data.map(p => ({
          id: p.id,
          product: typeof p.product === 'string' ? p.product : p.product?.id,
          product_name: typeof p.product === 'object' ? p.product?.name : null,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring,
          active: p.active,
          nickname: p.nickname,
          metadata: p.metadata,
        })),
      });
    }

    if (action === 'update-price') {
      const { product_id, unit_amount, currency, recurring, old_price_id, nickname } = body;

      if (!product_id || !unit_amount) {
        return jsonResponse({ error: 'product_id and unit_amount are required' }, 400);
      }

      // Create new price
      const newPrice = await stripe.prices.create({
        product: product_id,
        unit_amount: Math.round(unit_amount),
        currency: currency || 'brl',
        ...(recurring ? { recurring: { interval: recurring.interval || 'month' } } : {}),
        ...(nickname ? { nickname } : {}),
      });

      // Deactivate old price if provided
      if (old_price_id) {
        await stripe.prices.update(old_price_id, { active: false });
      }

      return jsonResponse({ price: newPrice });
    }

    if (action === 'list-packages') {
      const { data: packages, error } = await supabase
        .from('recruitment_credit_packages')
        .select('*')
        .order('credit_type', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ packages });
    }

    if (action === 'update-package') {
      const { id, name, credits, price_cents, bonus_percent, is_popular, is_active, description, display_order } = body;

      if (!id) return jsonResponse({ error: 'id is required' }, 400);

      // Get current package to check stripe sync
      const { data: current } = await supabase
        .from('recruitment_credit_packages')
        .select('*')
        .eq('id', id)
        .single();

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (name !== undefined) updates.name = name;
      if (credits !== undefined) updates.credits = credits;
      if (price_cents !== undefined) updates.price_cents = price_cents;
      if (bonus_percent !== undefined) updates.bonus_percent = bonus_percent;
      if (is_popular !== undefined) updates.is_popular = is_popular;
      if (is_active !== undefined) updates.is_active = is_active;
      if (description !== undefined) updates.description = description;
      if (display_order !== undefined) updates.display_order = display_order;

      // If price changed and we have a Stripe product, create new price
      if (price_cents !== undefined && current?.stripe_product_id && price_cents !== current.price_cents) {
        const newPrice = await stripe.prices.create({
          product: current.stripe_product_id,
          unit_amount: price_cents,
          currency: 'brl',
        });
        // Deactivate old price
        if (current.stripe_price_id) {
          await stripe.prices.update(current.stripe_price_id, { active: false });
        }
        updates.stripe_price_id = newPrice.id;
      }

      // If name changed and we have a Stripe product, update product name
      if (name !== undefined && current?.stripe_product_id && name !== current.name) {
        await stripe.products.update(current.stripe_product_id, { name });
      }

      const { data: updated, error } = await supabase
        .from('recruitment_credit_packages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ package: updated });
    }

    if (action === 'create-package') {
      const { name, credits, price_cents, credit_type, bonus_percent, description } = body as any;

      if (!name || !credits || !price_cents || !credit_type) {
        return jsonResponse({ error: 'name, credits, price_cents, credit_type are required' }, 400);
      }

      // Create Stripe product + price
      const product = await stripe.products.create({
        name: `Créditos: ${name}`,
        metadata: { type: 'credit_package', credit_type },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: price_cents,
        currency: 'brl',
      });

      const { data: pkg, error } = await supabase
        .from('recruitment_credit_packages')
        .insert({
          name,
          credits,
          price_cents,
          credit_type,
          bonus_percent: bonus_percent || 0,
          description: description || null,
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          is_active: true,
          is_popular: false,
        })
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ package: pkg });
    }

    if (action === 'list-costs') {
      const { data: costs, error } = await supabase
        .from('recruitment_credit_costs')
        .select('*')
        .order('credit_type', { ascending: true })
        .order('feature_key', { ascending: true });

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ costs });
    }

    if (action === 'update-cost') {
      const { id, credits_per_use, usage_unit } = body;

      if (!id) return jsonResponse({ error: 'id is required' }, 400);

      const updates: Record<string, unknown> = {};
      if (credits_per_use !== undefined) updates.credits_per_use = credits_per_use;
      if (usage_unit !== undefined) updates.usage_unit = usage_unit;

      const { data: updated, error } = await supabase
        .from('recruitment_credit_costs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ cost: updated });
    }

    if (action === 'get-official-prices') {
      const { data: config, error } = await supabase
        .from('platform_stripe_config')
        .select('price_org_base, price_seat_additional, updated_at')
        .limit(1)
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ config });
    }

    if (action === 'set-official-prices') {
      const { price_org_base, price_seat_additional } = body;

      if (!price_org_base || !price_seat_additional) {
        return jsonResponse({ error: 'price_org_base and price_seat_additional are required' }, 400);
      }

      // Get the single row id
      const { data: existing } = await supabase
        .from('platform_stripe_config')
        .select('id')
        .limit(1)
        .single();

      if (!existing) {
        return jsonResponse({ error: 'Config row not found' }, 500);
      }

      const { data: updated, error } = await supabase
        .from('platform_stripe_config')
        .update({
          price_org_base,
          price_seat_additional,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse({ config: updated });
    }

    // ── list-accounts-billing ──
    if (action === 'list-accounts-billing') {
      // Get all companies
      const { data: companies, error: compErr } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .order('name');
      if (compErr) return jsonResponse({ error: compErr.message }, 500);

      // Get org_billing
      const { data: billingRows } = await supabase
        .from('org_billing')
        .select('org_id, status, stripe_subscription_id, stripe_customer_id, trial_end');

      const billingMap: Record<string, any> = {};
      (billingRows || []).forEach((b: any) => { billingMap[b.org_id] = b; });

      // Get credits
      const { data: creditsRows } = await supabase
        .from('recruitment_usage_credits')
        .select('account_id, credit_type, balance');

      const creditsMap: Record<string, Record<string, number>> = {};
      (creditsRows || []).forEach((c: any) => {
        if (!creditsMap[c.account_id]) creditsMap[c.account_id] = {};
        creditsMap[c.account_id][c.credit_type] = c.balance ?? 0;
      });

      // Get active grants
      const { data: grantsRows } = await supabase
        .from('admin_grants')
        .select('org_id, expires_at')
        .gt('expires_at', new Date().toISOString())
        .is('revoked_at', null);

      const grantsMap: Record<string, string> = {};
      (grantsRows || []).forEach((g: any) => { if (g.org_id) grantsMap[g.org_id] = g.expires_at; });

      // For orgs with stripe subscription, batch-check status via Stripe
      const results = [];
      for (const co of (companies || [])) {
        const billing = billingMap[co.id];
        const cr = creditsMap[co.id] || {};
        let stripeStatus: string | null = null;

        if (billing?.stripe_subscription_id) {
          try {
            const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
            stripeStatus = sub.status; // active, past_due, canceled, trialing, etc.
          } catch (e) {
            stripeStatus = null;
          }
        }

        // Determine effective status
        let effectiveStatus = 'pending';
        if (stripeStatus) {
          effectiveStatus = stripeStatus;
        } else if (billing?.status) {
          effectiveStatus = billing.status;
        }

        results.push({
          id: co.id,
          name: co.name,
          created_at: co.created_at,
          billing_status: effectiveStatus,
          stripe_status: stripeStatus,
          has_grant: !!grantsMap[co.id],
          grant_expires_at: grantsMap[co.id] || null,
          hunting: cr.hunting ?? 0,
          enrichment: cr.enrichment ?? 0,
          ai_interview: cr.ai_interview ?? 0,
          outreach: cr.outreach ?? 0,
          marketplace: cr.marketplace ?? 0,
        });
      }

      return jsonResponse({ accounts: results });
    }

    // ── get-account-details ──
    if (action === 'get-account-details') {
      const { org_id } = body;
      if (!org_id) return jsonResponse({ error: 'org_id is required' }, 400);

      // Company info
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, created_at, cnpj, sector, employees_count, slug')
        .eq('id', org_id)
        .single();

      // Billing
      const { data: billing } = await supabase
        .from('org_billing')
        .select('*')
        .eq('org_id', org_id)
        .single();

      // Stripe subscription status
      let stripeStatus: string | null = null;
      let stripeInvoices: any[] = [];
      if (billing?.stripe_subscription_id) {
        try {
          const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
          stripeStatus = sub.status;
        } catch (_) {}
      }
      if (billing?.stripe_customer_id) {
        try {
          const invoices = await stripe.invoices.list({
            customer: billing.stripe_customer_id,
            limit: 50,
          });
          stripeInvoices = invoices.data.map((inv: any) => ({
            id: inv.id,
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            currency: inv.currency,
            status: inv.status,
            created: inv.created,
            hosted_invoice_url: inv.hosted_invoice_url,
            invoice_pdf: inv.invoice_pdf,
            description: inv.description || inv.lines?.data?.[0]?.description || null,
          }));
        } catch (_) {}
      }

      // DB invoices
      const { data: dbInvoices } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('org_id', org_id)
        .order('created_at', { ascending: false });

      // Active grants
      const { data: grants } = await supabase
        .from('admin_grants')
        .select('*')
        .eq('org_id', org_id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      // Members count
      const { count: membersCount } = await supabase
        .from('account_members')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', org_id)
        .eq('is_active', true);

      return jsonResponse({
        company,
        billing,
        stripe_status: stripeStatus,
        stripe_invoices: stripeInvoices,
        db_invoices: dbInvoices || [],
        grants: (grants || []).map((g: any) => ({
          ...g,
          is_active: new Date(g.expires_at) > new Date(),
        })),
        members_count: membersCount || 0,
      });
    }

    // ── block-account ──
    if (action === 'block-account') {
      const { org_id } = body;
      if (!org_id) return jsonResponse({ error: 'org_id is required' }, 400);

      const { error } = await supabase
        .from('org_billing')
        .update({ status: 'blocked', blocked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('org_id', org_id);

      if (error) {
        // If no row exists, insert one
        const { error: insertErr } = await supabase
          .from('org_billing')
          .insert({ org_id, status: 'blocked', blocked_at: new Date().toISOString() });
        if (insertErr) return jsonResponse({ error: insertErr.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    // ── reactivate-account ──
    if (action === 'reactivate-account') {
      const { org_id, grant_days } = body;
      if (!org_id) return jsonResponse({ error: 'org_id is required' }, 400);

      // Check if stripe subscription is active
      const { data: billing } = await supabase
        .from('org_billing')
        .select('stripe_subscription_id')
        .eq('org_id', org_id)
        .single();

      let isCompliant = false;
      if (billing?.stripe_subscription_id) {
        try {
          const sub = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
          isCompliant = ['active', 'trialing'].includes(sub.status);
        } catch (_) {}
      }

      if (isCompliant) {
        // Reactivate directly
        await supabase
          .from('org_billing')
          .update({ status: 'active', blocked_at: null, updated_at: new Date().toISOString() })
          .eq('org_id', org_id);
        return jsonResponse({ success: true, method: 'direct' });
      }

      // Not compliant — create temporary grant
      const days = Number(grant_days) || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const { error: grantErr } = await supabase
        .from('admin_grants')
        .insert({
          org_id,
          user_id: null,
          created_by: user.id,
          reason: `Acesso temporário concedido por ${days} dias pelo admin`,
          expires_at: expiresAt.toISOString(),
        });

      if (grantErr) return jsonResponse({ error: grantErr.message }, 500);

      // Also unblock
      await supabase
        .from('org_billing')
        .update({ status: 'active', blocked_at: null, updated_at: new Date().toISOString() })
        .eq('org_id', org_id);

      return jsonResponse({ success: true, method: 'grant', expires_at: expiresAt.toISOString(), days });
    }

    // ── sync-package ──
    if (action === 'sync-package') {
      const { package_id } = body;
      if (!package_id) return jsonResponse({ error: 'package_id is required' }, 400);

      // Fetch package from DB
      const { data: pkg, error: pkgErr } = await supabase
        .from('recruitment_credit_packages')
        .select('*')
        .eq('id', package_id)
        .single();

      if (pkgErr || !pkg) return jsonResponse({ error: 'Pacote não encontrado' }, 404);

      if (pkg.stripe_product_id && pkg.stripe_price_id) {
        return jsonResponse({ error: 'Pacote já está sincronizado com o Stripe' }, 400);
      }

      // Create Stripe product
      const product = await stripe.products.create({
        name: `Créditos: ${pkg.name}`,
        metadata: { type: 'credit_package', credit_type: pkg.credit_type, package_id: pkg.id },
      });

      // Create Stripe price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pkg.price_cents,
        currency: 'brl',
      });

      // Update package in DB
      const { data: updated, error: updateErr } = await supabase
        .from('recruitment_credit_packages')
        .update({
          stripe_product_id: product.id,
          stripe_price_id: price.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', package_id)
        .select()
        .single();

      if (updateErr) return jsonResponse({ error: updateErr.message }, 500);
      return jsonResponse({ package: updated });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('platform-admin-stripe error:', err);
    return jsonResponse({ error: err.message || 'Internal server error' }, 500);
  }
});
