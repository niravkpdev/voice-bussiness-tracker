import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, employee_id, business_id } = await req.json()
    
    if (!email || !password || !employee_id) {
      throw new Error('Missing required fields: email, password, employee_id')
    }

    // Get the JWT from the request header to identify the invoking admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseUrl = Deno.env.get('PROJECT_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server misconfiguration: missing Supabase credentials')
    }

    // 1. Client representing the admin user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: adminUser }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !adminUser) {
      throw new Error('Unauthorized: Invalid token')
    }

    // 2. Admin client bypassing RLS to create user and mapping
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    })

    if (authError) throw authError

    const newUserId = authData.user.id

    // Map to employee_user_mappings
    const { error: mappingError } = await supabaseAdmin
      .from('employee_user_mappings')
      .insert([
        {
          employee_id: employee_id,
          user_id: newUserId,
          business_id: business_id || 'default',
          employee_email: email,
          status: 'active'
        }
      ])

    if (mappingError) {
      // Rollback user creation
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw mappingError
    }

    // Add audit log
    await supabaseAdmin.from('audit_logs').insert([
        {
            id: crypto.randomUUID(),
            user_id: adminUser.id, // the admin who performed the action
            data: {
              action: 'CREATE_EMPLOYEE_LOGIN',
              employee_id: employee_id,
              created_user_id: newUserId,
              email: email
            }
        }
    ])

    return new Response(
      JSON.stringify({ success: true, message: 'Employee login created successfully', user_id: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
