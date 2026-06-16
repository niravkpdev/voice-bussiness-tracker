-- Phase H: Employee Self-Edit Permissions
-- This table stores profile change requests made by employees for approval by Owner/Manager.

CREATE TABLE IF NOT EXISTS public.employee_profile_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    business_id TEXT DEFAULT 'default',
    company_id TEXT DEFAULT 'default',
    requested_by TEXT NOT NULL,
    changes JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    rejection_reason TEXT,
    reviewed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.employee_profile_requests ENABLE ROW LEVEL SECURITY;

-- 1. Employees can select their own requests, OR Owner/Manager/Accountant can select all requests.
-- For simplicity, if auth.uid() = requested_by OR user role in owner/manager.
CREATE POLICY "Allow select on employee_profile_requests"
    ON public.employee_profile_requests
    FOR SELECT
    USING (
        auth.uid()::text = requested_by 
        OR 
        EXISTS (
            SELECT 1 FROM public.employee_user_mapping m 
            WHERE m.uid = auth.uid() AND m.role IN ('Owner', 'Manager', 'Accountant')
        )
    );

-- 2. Employees can insert requests for themselves.
CREATE POLICY "Allow insert on employee_profile_requests"
    ON public.employee_profile_requests
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = requested_by
    );

-- 3. Owner/Manager can update requests (to Approve/Reject).
CREATE POLICY "Allow update on employee_profile_requests"
    ON public.employee_profile_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.employee_user_mapping m 
            WHERE m.uid = auth.uid() AND m.role IN ('Owner', 'Manager')
        )
    );

-- Employees are strictly blocked from updating the main 'employees' table directly.
-- The existing RLS on 'employees' handles this (only Owner/Manager have full UPDATE).
