/**
 * Tests workflow enforcement scenarios.
 * Requires: .env.local with VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node --env-file=.env.local scripts/test-workflow-enforcement.js
 *
 * Optionally syncs workflows to admin-free config before testing (default: true).
 */
import { createClient } from '@supabase/supabase-js';
import { canApproveByWorkflow } from '../lib/workflowEnforcement.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use: node --env-file=.env.local scripts/test-workflow-enforcement.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Expected workflow config (admin-free) for deterministic testing */
const EXPECTED_WORKFLOWS = [
  {
    type: 'purchase_order',
    name: 'Purchase Order Approval',
    levels: [
      { level: 1, name: 'Initial Review', roles: ['project_manager', 'finance'], approvers: [], amount_threshold: 10000, required: true },
      { level: 2, name: 'Finance Approval', roles: ['finance'], approvers: [], amount_threshold: 50000, required: true },
      { level: 3, name: 'Executive Approval', roles: ['finance'], approvers: [], amount_threshold: 100000, required: true },
    ],
    auto_approval_threshold: 5000,
  },
  {
    type: 'vendor_invoice',
    name: 'Vendor Invoice Approval',
    levels: [
      { level: 1, name: 'Finance Review', roles: ['finance'], approvers: [], amount_threshold: 0, required: true },
    ],
    auto_approval_threshold: 0,
  },
  {
    type: 'payment_request',
    name: 'Payment Request Approval',
    levels: [
      { level: 1, name: 'Project Manager Approval', roles: ['project_manager', 'finance'], approvers: [], amount_threshold: 25000, required: true },
      { level: 2, name: 'Finance Manager Approval', roles: ['finance'], approvers: [], amount_threshold: 100000, required: true },
      { level: 3, name: 'Executive Approval', roles: ['finance'], approvers: [], amount_threshold: 999999999, required: true },
    ],
    auto_approval_threshold: 10000,
  },
  {
    type: 'customer_invoice',
    name: 'Customer Invoice Approval',
    levels: [
      { level: 1, name: 'Finance Approval', roles: ['finance'], approvers: [], amount_threshold: 0, required: true },
    ],
    auto_approval_threshold: 0,
  },
];

async function syncWorkflows() {
  for (const wf of EXPECTED_WORKFLOWS) {
    const { data: existing } = await supabase
      .from('approval_workflows')
      .select('id')
      .eq('type', wf.type)
      .maybeSingle();
    const payload = {
      type: wf.type,
      name: wf.name,
      levels: wf.levels,
      auto_approval_threshold: wf.auto_approval_threshold,
      is_active: true,
    };
    if (existing) {
      await supabase.from('approval_workflows').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('approval_workflows').insert({
        ...payload,
        id: crypto.randomUUID(),
        description: '',
        steps: [],
        escalation_timeout_hours: 24,
      });
    }
  }
  console.log('Synced workflows to admin-free config.\n');
}

const SENTINEL = 999999999;

function ok(label, result) {
  const pass = result === true;
  console.log(`  ${pass ? '✓' : '✗'} ${label}`);
  return pass;
}

async function runScenario(label, opts, expectedAllowed) {
  const { allowed } = await canApproveByWorkflow(opts);
  return ok(label, allowed === expectedAllowed);
}

async function main() {
  console.log('\n=== Workflow Enforcement Test Suite ===\n');

  await syncWorkflows();

  let passed = 0;
  let failed = 0;

  // ── 0. Verify no workflow has admin in level roles ───────────────────────
  console.log('0. Workflow levels must not include admin role');
  const { data: allWorkflows } = await supabase.from('approval_workflows').select('type, levels');
  let hasAdminInLevel = false;
  for (const w of allWorkflows ?? []) {
    const levels = w.levels ?? [];
    for (const lvl of levels) {
      if ((lvl.roles ?? []).includes('admin')) {
        hasAdminInLevel = true;
        break;
      }
    }
  }
  if (ok('No workflow level contains admin role', !hasAdminInLevel)) passed++; else failed++;
  console.log('');

  // ── 1. Admin bypass ─────────────────────────────────────────────────────
  console.log('1. Admin bypass (admin always allowed)');
  if (await runScenario('Admin + 150K PO', {
    entity: 'purchase-orders',
    amount: 150000,
    userId: 'admin-uuid',
    userRole: 'admin',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Admin + 1M payment', {
    entity: 'payments',
    amount: 1000000,
    userId: 'admin-uuid',
    userRole: 'admin',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  console.log('');

  // ── 2. Auto-approval (below threshold) ───────────────────────────────────
  console.log('2. Auto-approval (amount below autoApprovalThreshold)');
  // PO auto threshold typically 5000
  if (await runScenario('Finance + 3K PO (auto)', {
    entity: 'purchase-orders',
    amount: 3000,
    userId: 'finance-uuid',
    userRole: 'finance',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Project manager + 4K PO (auto)', {
    entity: 'purchase-orders',
    amount: 4000,
    userId: 'pm-uuid',
    userRole: 'project_manager',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Employee + 2K PO (auto)', {
    entity: 'purchase-orders',
    amount: 2000,
    userId: 'emp-uuid',
    userRole: 'employee',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  console.log('');

  // ── 3. Level-based: correct role allowed ──────────────────────────────
  console.log('3. Level-based: user with correct role allowed');
  // Level 1 (10K): PM or Finance. Level 2 (50K): Finance. Level 3 (100K): Finance
  if (await runScenario('PM + 15K PO (level 1)', {
    entity: 'purchase-orders',
    amount: 15000,
    userId: 'pm-uuid',
    userRole: 'project_manager',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Finance + 15K PO (level 1)', {
    entity: 'purchase-orders',
    amount: 15000,
    userId: 'finance-uuid',
    userRole: 'finance',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Finance + 75K PO (level 2)', {
    entity: 'purchase-orders',
    amount: 75000,
    userId: 'finance-uuid',
    userRole: 'finance',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Finance + 150K PO (level 3)', {
    entity: 'purchase-orders',
    amount: 150000,
    userId: 'finance-uuid',
    userRole: 'finance',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  console.log('');

  // ── 4. Level-based: wrong role denied ───────────────────────────────────
  console.log('4. Level-based: user without required role denied');
  if (await runScenario('PM + 75K PO (level 2 needs finance)', {
    entity: 'purchase-orders',
    amount: 75000,
    userId: 'pm-uuid',
    userRole: 'project_manager',
    customRoleId: null,
    hasRbacApprove: true,
  }, false)) passed++; else failed++;
  if (await runScenario('Employee + 20K PO (level 1 needs PM/finance)', {
    entity: 'purchase-orders',
    amount: 20000,
    userId: 'emp-uuid',
    userRole: 'employee',
    customRoleId: null,
    hasRbacApprove: true,
  }, false)) passed++; else failed++;
  if (await runScenario('PM + 150K PO (level 3 needs finance)', {
    entity: 'purchase-orders',
    amount: 150000,
    userId: 'pm-uuid',
    userRole: 'project_manager',
    customRoleId: null,
    hasRbacApprove: true,
  }, false)) passed++; else failed++;
  console.log('');

  // ── 5. Vendor invoice (single level: finance) ───────────────────────────
  console.log('5. Vendor invoice workflow (finance required)');
  if (await runScenario('Finance + 50K vendor invoice', {
    entity: 'vendorInvoices',
    amount: 50000,
    userId: 'finance-uuid',
    userRole: 'finance',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('PM + 50K vendor invoice (finance required)', {
    entity: 'vendorInvoices',
    amount: 50000,
    userId: 'pm-uuid',
    userRole: 'project_manager',
    customRoleId: null,
    hasRbacApprove: true,
  }, false)) passed++; else failed++;
  console.log('');

  // ── 6. Customer invoice (single level: finance) ──────────────────────────
  console.log('6. Customer invoice workflow (finance required)');
  if (await runScenario('Finance + 30K customer invoice', {
    entity: 'customerInvoices',
    amount: 30000,
    userId: 'finance-uuid',
    userRole: 'finance',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Employee + 10K customer invoice', {
    entity: 'customerInvoices',
    amount: 10000,
    userId: 'emp-uuid',
    userRole: 'employee',
    customRoleId: null,
    hasRbacApprove: true,
  }, false)) passed++; else failed++;
  console.log('');

  // ── 7. Payment request (multi-level) ───────────────────────────────────
  console.log('7. Payment request workflow');
  if (await runScenario('PM + 15K payment (level 1)', {
    entity: 'payments',
    amount: 15000,
    userId: 'pm-uuid',
    userRole: 'project_manager',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('Finance + 50K payment (level 2)', {
    entity: 'payments',
    amount: 50000,
    userId: 'finance-uuid',
    userRole: 'finance',
    customRoleId: null,
    hasRbacApprove: true,
  }, true)) passed++; else failed++;
  if (await runScenario('PM + 120K payment (level 3 needs finance)', {
    entity: 'payments',
    amount: 120000,
    userId: 'pm-uuid',
    userRole: 'project_manager',
    customRoleId: null,
    hasRbacApprove: true,
  }, false)) passed++; else failed++;
  console.log('');

  // ── 8. Unknown entity (no workflow, allowed) ───────────────────────────
  console.log('8. Unknown entity (no workflow → allowed)');
  if (await runScenario('Any user + unknown entity', {
    entity: 'projects',
    amount: 100000,
    userId: 'any-uuid',
    userRole: 'employee',
    customRoleId: null,
    hasRbacApprove: false,
  }, true)) passed++; else failed++;
  console.log('');

  // ── 9. Reason returned when denied ──────────────────────────────────────
  console.log('9. Denial reason returned when not allowed');
  const denied = await canApproveByWorkflow({
    entity: 'purchase-orders',
    amount: 100000,
    userId: 'emp-uuid',
    userRole: 'employee',
    customRoleId: null,
    hasRbacApprove: true,
  });
  const hasReason = !denied.allowed && typeof denied.reason === 'string' && denied.reason.length > 0;
  if (ok('Denied response includes reason', hasReason)) passed++; else failed++;
  if (hasReason) console.log(`    Reason: "${denied.reason}"`);
  console.log('');

  // ── 10. Disabled workflow allows approval (RBAC only) ───────────────────
  console.log('10. Disabled workflow (is_active: false) allows approval');
  const poWorkflow = await supabase.from('approval_workflows').select('id').eq('type', 'purchase_order').single();
  if (poWorkflow.data?.id) {
    await supabase.from('approval_workflows').update({ is_active: false }).eq('id', poWorkflow.data.id);
    const disabledResult = await canApproveByWorkflow({
      entity: 'purchase-orders',
      amount: 100000,
      userId: 'emp-uuid',
      userRole: 'employee',
      customRoleId: null,
      hasRbacApprove: true,
    });
    await supabase.from('approval_workflows').update({ is_active: true }).eq('id', poWorkflow.data.id);
    if (ok('Employee + 100K PO when workflow disabled → allowed', disabledResult.allowed === true)) passed++; else failed++;
  } else {
    console.log('  (skip: no purchase_order workflow)');
  }
  console.log('');

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('=== Summary ===');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log('');

  if (failed > 0) {
    console.error('Some tests failed. Ensure approval_workflows are seeded (open Settings → Approval Workflows).');
    process.exit(1);
  }
  console.log('All workflow enforcement scenarios passed.');
}

main().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
