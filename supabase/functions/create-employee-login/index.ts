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

  let step = 'init'

  try {
    step = 'parse_body'
    const body = await req.json()
    const { email, password, employee_id, business_id } = body
    
    console.log(`[CREATE LOGIN] Received body keys: ${Object.keys(body).join(', ')}`)
    console.log(`[CREATE LOGIN] employee_id: ${employee_id}`)
    console.log(`[CREATE LOGIN] business_id: ${business_id}`)
    console.log(`[CREATE LOGIN] email: ${email}`)

    if (!email || !password || !employee_id) {
      throw new Error('Missing required fields: email, password, employee_id')
    }

    step = 'check_auth_header'
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    step = 'init_admin_client'
    const supabaseUrl = Deno.env.get('PROJECT_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

    console.log(`[CREATE LOGIN] PROJECT_URL exists: ${!!supabaseUrl}`)
    console.log(`[CREATE LOGIN] SERVICE_ROLE_KEY exists: ${!!supabaseServiceKey}`)

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server misconfiguration: missing Supabase credentials')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    step = 'get_auth_user'
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !adminUser) {
      console.error(`[CREATE LOGIN] User validation failed:`, userError)
      throw new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`)
    }
    console.log(`[CREATE LOGIN] Admin validated: ${adminUser.id}`)

    step = 'create_user'

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    })

    if (authError) {
      console.error(`[CREATE LOGIN] auth.admin.createUser error:`, authError)
      throw authError
    }

    const newUserId = authData.user.id
    console.log(`[CREATE LOGIN] Created user: ${newUserId}`)

    step = 'insert_mapping'
    console.log(`[CREATE LOGIN] Inserting into table: employee_user_mappings`)
    const { error: mappingError } = await supabaseAdmin
      .from('employee_user_mappings')
      .insert([
        {
          owner_user_id: adminUser.id,
          employee_id: employee_id,
          user_id: newUserId,
          business_id: business_id || 'default',
          employee_email: email,
          status: 'active'
        }
      ])

    if (mappingError) {
      console.error(`[CREATE LOGIN] employee_user_mappings insert error:`, mappingError)
      step = 'rollback_user'
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw mappingError
    }

    step = 'insert_audit_log'
    await supabaseAdmin.from('audit_logs').insert([
        {
            id: crypto.randomUUID(),
            user_id: adminUser.id,
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
    const errorMsg = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Unknown error occurred';
    console.error(`[CREATE LOGIN] Failed at step: ${step}, Error: ${errorMsg}`);
    
    return new Response(
      JSON.stringify({ success: false, step: step, error: errorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
