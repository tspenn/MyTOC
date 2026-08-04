import { createClient } from 'jsr:@supabase/supabase-js@2'
import { deleteChkchkUserData } from './delete-chkchk-data.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface DeleteAccountRequest {
  userId?: string
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    let body: DeleteAccountRequest = {}
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const requestedUserId = body.userId?.trim()
    if (!requestedUserId) {
      return jsonResponse({ error: 'userId is required' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    if (user.id !== requestedUserId) {
      return jsonResponse({ error: 'You can only delete your own account' }, 403)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { steps, warnings } = await deleteChkchkUserData(adminClient, user.id)

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteUserError) {
      return jsonResponse({
        error: `Account data removed, but auth deletion failed: ${deleteUserError.message}`,
        steps,
        warnings,
      }, 500)
    }

    return jsonResponse({
      success: true,
      userId: user.id,
      steps,
      warnings,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete account'
    console.error('delete-account-chkchk error:', message)
    return jsonResponse({ error: message }, 500)
  }
})
