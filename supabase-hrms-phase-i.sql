-- Phase I: Employee Login System RPCs

-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Employee Login RPC
CREATE OR REPLACE FUNCTION public.create_employee_login(
    p_email text,
    p_password text,
    p_employee_id text,
    p_business_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_new_user_id uuid;
    v_owner_user_id uuid := auth.uid();
BEGIN
    -- Authorization: Caller must be owner/manager of the business
    IF NOT public.has_company_role(v_owner_user_id, p_business_id, array['owner', 'manager']) THEN
        RAISE EXCEPTION 'Not authorized to create employee logins for this business.';
    END IF;

    -- Check if email already exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with this email already exists.';
    END IF;

    -- Check if mapping already exists and is active for this employee
    IF EXISTS (
        SELECT 1 FROM public.employee_user_mappings 
        WHERE employee_id = p_employee_id 
        AND business_id = p_business_id 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'This employee already has an active login mapped.';
    END IF;

    -- Insert into auth.users using pgcrypto for password hashing
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"force_password_change":true}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO v_new_user_id;

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_new_user_id,
        format('{"sub":"%s","email":"%s"}', v_new_user_id::text, p_email)::jsonb,
        'email',
        now(),
        now(),
        now()
    );

    -- Insert or update the employee_user_mappings
    INSERT INTO public.employee_user_mappings (
        owner_user_id,
        business_id,
        user_id,
        employee_id,
        employee_email,
        status,
        linked_at,
        created_at
    ) VALUES (
        v_owner_user_id,
        p_business_id,
        v_new_user_id,
        p_employee_id,
        p_email,
        'active',
        now(),
        now()
    )
    ON CONFLICT (owner_user_id, business_id, employee_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        employee_email = EXCLUDED.employee_email,
        status = 'active',
        linked_at = now();

    RETURN v_new_user_id;
END;
$$;


-- 2. Reset Employee Password RPC
CREATE OR REPLACE FUNCTION public.reset_employee_password(
    p_employee_id text,
    p_business_id text,
    p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_owner_user_id uuid := auth.uid();
    v_target_user_id uuid;
BEGIN
    -- Authorization: Caller must be owner/manager of the business
    IF NOT public.has_company_role(v_owner_user_id, p_business_id, array['owner', 'manager']) THEN
        RAISE EXCEPTION 'Not authorized to reset employee passwords for this business.';
    END IF;

    -- Find the mapped user
    SELECT user_id INTO v_target_user_id
    FROM public.employee_user_mappings
    WHERE employee_id = p_employee_id
      AND business_id = p_business_id
      AND status = 'active'
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'No active login mapping found for this employee.';
    END IF;

    -- Update auth.users password and set force_password_change
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"force_password_change":true}'::jsonb,
        updated_at = now()
    WHERE id = v_target_user_id;
END;
$$;


-- 3. Disable Employee Login RPC
CREATE OR REPLACE FUNCTION public.disable_employee_login(
    p_employee_id text,
    p_business_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_owner_user_id uuid := auth.uid();
BEGIN
    -- Authorization: Caller must be owner/manager of the business
    IF NOT public.has_company_role(v_owner_user_id, p_business_id, array['owner', 'manager']) THEN
        RAISE EXCEPTION 'Not authorized to manage employee logins for this business.';
    END IF;

    -- Update mapping status to 'disabled'
    UPDATE public.employee_user_mappings
    SET status = 'disabled'
    WHERE employee_id = p_employee_id
      AND business_id = p_business_id;

    -- We do not delete the auth.users record, we just disable the mapping.
    -- The RLS policies rely on status = 'active'.
END;
$$;


-- 4. Employee Change Password RPC
CREATE OR REPLACE FUNCTION public.employee_change_password(
    p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.';
    END IF;

    -- Update auth.users password and clear force_password_change
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
        raw_user_meta_data = raw_user_meta_data - 'force_password_change',
        updated_at = now()
    WHERE id = v_user_id;
END;
$$;
