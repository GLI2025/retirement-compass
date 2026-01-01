import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calculatorData } = await req.json();
    
    if (!calculatorData) {
      throw new Error("Calculator data is required");
    }

    console.log("Creating checkout session for PDF export");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://kdiaurqxhmjgjcgnqtnj.lovableproject.com";

    // Create a one-time payment session with calculator data in metadata
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: "price_1Sku0jD7cx6bKvinHx3Ldrhd", // $3 Retirement PDF price
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/export-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?export=cancelled`,
      metadata: {
        calculatorData: JSON.stringify(calculatorData),
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
