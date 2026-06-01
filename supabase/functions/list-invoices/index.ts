import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-INVOICES] ${step}${detailsStr}`);
};

// IDs dos preços do Culture Coach - filtrar apenas faturas destes produtos
const CULTURE_COACH_PRICE_IDS = [
  "price_1SivZbKV6gEseQSlAlIoMXok", // Org base - R$ 297/mês (atual)
  "price_1SivVVKV6gEseQSlq5aQKC2D", // Org base - R$ 197/mês (legado)
  "price_1SivVkKV6gEseQSlCuzv0qAM", // Seat adicional original
  "price_1SizCUKV6gEseQSlCVl5Wo4x", // Seat adicional variante
];

interface FormattedTransaction {
  id: string;
  number: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  period_start: number | null;
  period_end: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  receipt_url: string | null;
  description: string | null;
  lines: Array<{
    description: string | null;
    amount: number;
    quantity: number | null;
  }>;
  type: 'invoice' | 'payment';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { account_id, limit = 20 } = await req.json();
    if (!account_id) throw new Error("account_id is required");

    // Verify user has access to account
    const { data: membership, error: memberError } = await supabaseClient
      .from('account_members')
      .select('role')
      .eq('account_id', account_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      throw new Error("User does not have access to this account");
    }
    logStep("User access verified", { role: membership.role });

    // Get Stripe customer ID from org_billing
    const { data: billing, error: billingError } = await supabaseClient
      .from('org_billing')
      .select('stripe_customer_id')
      .eq('org_id', account_id)
      .single();

    if (billingError || !billing?.stripe_customer_id) {
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Found Stripe customer", { customerId: billing.stripe_customer_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch invoices
    const invoices = await stripe.invoices.list({
      customer: billing.stripe_customer_id,
      limit: Math.min(limit, 100),
    });

    // Filtrar apenas faturas que contêm produtos do Culture Coach
    const cultureCoachInvoices = invoices.data.filter((invoice: Stripe.Invoice) => {
      return invoice.lines.data.some((line: Stripe.InvoiceLineItem) => {
        const priceId = (line.price as Stripe.Price)?.id || '';
        return CULTURE_COACH_PRICE_IDS.includes(priceId);
      });
    });

    logStep("Filtered Culture Coach invoices", { 
      totalInvoices: invoices.data.length, 
      cultureCoachInvoices: cultureCoachInvoices.length 
    });

    const formattedInvoices: FormattedTransaction[] = cultureCoachInvoices.map((invoice: Stripe.Invoice) => {
      // Filtrar apenas linhas do Culture Coach
      const cultureCoachLines = invoice.lines.data.filter((line: Stripe.InvoiceLineItem) => {
        const priceId = (line.price as Stripe.Price)?.id || '';
        return CULTURE_COACH_PRICE_IDS.includes(priceId);
      });

      return {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        receipt_url: null,
        description: invoice.description,
        lines: cultureCoachLines.map((line: Stripe.InvoiceLineItem) => ({
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
        })),
        type: 'invoice' as const,
      };
    });

    // Fetch Payment Intents for seat upgrades
    const paymentIntents = await stripe.paymentIntents.list({
      customer: billing.stripe_customer_id,
      limit: 50,
    });

    // Filter seat upgrade payments (succeeded with metadata type = seat_upgrade)
    const seatPayments = paymentIntents.data.filter((pi: Stripe.PaymentIntent) => 
      pi.status === 'succeeded' && 
      pi.metadata?.type === 'seat_upgrade'
    );

    logStep("Found seat upgrade payments", { count: seatPayments.length });

    // Format payment intents as transactions
    const formattedPayments: FormattedTransaction[] = await Promise.all(
      seatPayments.map(async (pi: Stripe.PaymentIntent) => {
        // Try to get the receipt URL from the charge
        let receiptUrl: string | null = null;
        if (pi.latest_charge && typeof pi.latest_charge === 'string') {
          try {
            const charge = await stripe.charges.retrieve(pi.latest_charge);
            receiptUrl = charge.receipt_url;
          } catch (e) {
            logStep("Could not fetch charge receipt", { chargeId: pi.latest_charge });
          }
        }

        const quantity = parseInt(pi.metadata?.quantity || '1');
        return {
          id: pi.id,
          number: null,
          status: 'paid',
          amount_due: pi.amount,
          amount_paid: pi.amount,
          currency: pi.currency,
          created: pi.created,
          period_start: null,
          period_end: null,
          hosted_invoice_url: null,
          invoice_pdf: null,
          receipt_url: receiptUrl,
          description: pi.description || `Compra de ${quantity} assento(s) adicional(is)`,
          lines: [{
            description: `${quantity} assento(s) adicional(is) - Pro-rata`,
            amount: pi.amount,
            quantity: quantity,
          }],
          type: 'payment' as const,
        };
      })
    );

    // Merge and sort by date (newest first)
    const allTransactions = [...formattedInvoices, ...formattedPayments]
      .sort((a, b) => b.created - a.created);

    logStep("Total transactions", { count: allTransactions.length });

    return new Response(JSON.stringify({ invoices: allTransactions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
