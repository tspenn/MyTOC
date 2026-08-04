import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** Returns the VAPID public key (safe to expose). Private key stays server-side. */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const publicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY") || "";
  if (!publicKey) {
    return new Response(JSON.stringify({ error: "Web push public key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
