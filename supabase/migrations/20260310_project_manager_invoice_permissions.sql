-- Add vendor_invoices.view, customer_invoices.view, and payments.view for project_manager
-- Required for Dashboard financial KPIs (revenue, expenses, outstanding use invoices + payments)
INSERT INTO role_permissions (id, role_id, module, action, allowed)
VALUES
  (gen_random_uuid()::text, 'project_manager', 'vendor_invoices', 'view', true),
  (gen_random_uuid()::text, 'project_manager', 'customer_invoices', 'view', true),
  (gen_random_uuid()::text, 'project_manager', 'payments', 'view', true)
ON CONFLICT (role_id, module, action) DO UPDATE SET allowed = EXCLUDED.allowed;
