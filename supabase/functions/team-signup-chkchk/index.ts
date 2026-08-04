import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function teamLoginEmail(bossCode: string, workerNumber: string): string {
  return `${bossCode.trim().toLowerCase()}-${workerNumber.trim()}@team.chkchk.local`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { boss_code, worker_number, password } = await req.json() as {
      boss_code?: string
      worker_number?: string
      password?: string
    }

    if (!boss_code?.trim() || !worker_number?.trim() || !password) {
      return new Response(JSON.stringify({ error: 'Lead ID, worker number, and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // Validate slot is pending
    const { data: slotCheck } = await admin.rpc('chkchk_validate_team_slot', {
      p_boss_code: boss_code.trim(),
      p_worker_number: worker_number.trim(),
    })

    if (!slotCheck?.valid) {
      return new Response(JSON.stringify({ error: 'Invalid Lead ID or worker number, or already claimed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = teamLoginEmail(boss_code, worker_number)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        team_signup: true,
        boss_code: boss_code.trim(),
        worker_number: worker_number.trim(),
      },
    })

    if (createError) {
      const msg = createError.message.includes('already') || createError.message.includes('registered')
        ? 'This worker number is already registered. Try signing in.'
        : createError.message
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!created.user) {
      return new Response(JSON.stringify({ error: 'Could not create account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: claimData, error: claimError } = await admin.rpc('chkchk_claim_team_slot', {
      p_boss_code: boss_code.trim(),
      p_worker_number: worker_number.trim(),
      p_user_id: created.user.id,
    })

    if (claimError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      email,
      display_name: claimData?.display_name,
      worker_number: claimData?.worker_number,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('team-signup-chkchk error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
