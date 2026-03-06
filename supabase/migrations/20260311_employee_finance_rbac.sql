-- Add missing RBAC permissions for Employee and Finance roles
-- Employee: customers.view, vendors.view (Dashboard quick stats, Projects customer names)
-- Finance: tasks.view, budget.view (Dashboard Recent Projects, Projects page, Reports)

INSERT INTO role_permissions (id, role_id, module, action, allowed)
VALUES
  (gen_random_uuid()::text, 'employee', 'customers', 'view', true),
  (gen_random_uuid()::text, 'employee', 'vendors', 'view', true),
  (gen_random_uuid()::text, 'finance', 'tasks', 'view', true),
  (gen_random_uuid()::text, 'finance', 'budget', 'view', true)
ON CONFLICT (role_id, module, action) DO UPDATE SET allowed = EXCLUDED.allowed;
