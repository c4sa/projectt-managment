import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Save, Settings2, DollarSign, CheckCircle, Edit2, Users, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { dataStore, SystemUser } from '../../data/store';

const SENTINEL_NO_LIMIT = 999999999;

interface ApprovalLevel {
  level: number;
  name: string;
  roles: string[];
  approvers: string[];
  amountThreshold: number;
  required: boolean;
}

interface WorkflowConfig {
  id?: string;
  type: string;
  name: string;
  description: string;
  enabled: boolean;
  levels: ApprovalLevel[];
  autoApprovalThreshold: number;
  escalationTimeout: number;
}

const DEFAULT_WORKFLOWS: WorkflowConfig[] = [
  {
    type: 'purchase_order',
    name: 'Purchase Order Approval',
    description: 'Approval workflow for purchase orders',
    enabled: true,
    levels: [
      { level: 1, name: 'Initial Review', roles: ['project_manager', 'finance'], approvers: [], amountThreshold: 10000, required: true },
      { level: 2, name: 'Finance Approval', roles: ['finance', 'admin'], approvers: [], amountThreshold: 50000, required: true },
      { level: 3, name: 'Executive Approval', roles: ['admin'], approvers: [], amountThreshold: 100000, required: true },
    ],
    autoApprovalThreshold: 5000,
    escalationTimeout: 24,
  },
  {
    type: 'vendor_invoice',
    name: 'Vendor Invoice Approval',
    description: 'Approval workflow for vendor invoices',
    enabled: true,
    levels: [
      { level: 1, name: 'Finance Review', roles: ['finance', 'admin'], approvers: [], amountThreshold: 0, required: true },
    ],
    autoApprovalThreshold: 0,
    escalationTimeout: 48,
  },
  {
    type: 'payment_request',
    name: 'Payment Request Approval',
    description: 'Multi-level approval workflow for payment requests',
    enabled: true,
    levels: [
      { level: 1, name: 'Project Manager Approval', roles: ['project_manager', 'finance'], approvers: [], amountThreshold: 25000, required: true },
      { level: 2, name: 'Finance Manager Approval', roles: ['finance', 'admin'], approvers: [], amountThreshold: 100000, required: true },
      { level: 3, name: 'Executive Approval', roles: ['admin'], approvers: [], amountThreshold: 999999999, required: true },
    ],
    autoApprovalThreshold: 10000,
    escalationTimeout: 12,
  },
  {
    type: 'customer_invoice',
    name: 'Customer Invoice Approval',
    description: 'Approval workflow for customer invoices',
    enabled: true,
    levels: [
      { level: 1, name: 'Finance Approval', roles: ['finance', 'admin'], approvers: [], amountThreshold: 0, required: true },
    ],
    autoApprovalThreshold: 0,
    escalationTimeout: 24,
  },
  {
    type: 'budget_change',
    name: 'Budget Change Approval',
    description: 'Approval workflow for budget modifications',
    enabled: true,
    levels: [
      { level: 1, name: 'Admin Approval', roles: ['admin'], approvers: [], amountThreshold: 0, required: true },
    ],
    autoApprovalThreshold: 0,
    escalationTimeout: 24,
  },
];

const BUILTIN_ROLES = ['admin', 'project_manager', 'finance', 'employee'];

export function ApprovalWorkflowsSettings() {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowConfig | null>(null);
  const [editingLevel, setEditingLevel] = useState<number | null>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [customRoles, setCustomRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedError, setSeedError] = useState<string | null>(null);
  const seedingRef = React.useRef(false);

  useEffect(() => {
    Promise.all([dataStore.getUsers(), dataStore.getCustomRoles()])
      .then(([u, r]) => {
        setUsers(u ?? []);
        setCustomRoles(r ?? []);
      })
      .catch((e) => console.error('Failed to load users/roles', e));
  }, []);

  const mapWorkflow = (w: any) => ({
    id: w.id,
    type: w.type,
    name: w.name,
    description: w.description || '',
    enabled: w.isActive !== false,
    levels: Array.isArray(w.levels) && w.levels.length > 0
      ? w.levels.map((l: any) => {
          const raw = l.amountThreshold;
          const amountThreshold =
            raw == null || raw === Infinity || raw >= SENTINEL_NO_LIMIT ? SENTINEL_NO_LIMIT : Number(raw);
          return {
            level: l.level ?? 1,
            name: l.name ?? '',
            roles: l.roles ?? [],
            approvers: l.approvers ?? [],
            amountThreshold,
            required: l.required !== false,
          };
        })
      : [],
    autoApprovalThreshold: w.autoApprovalThreshold ?? 0,
    escalationTimeout: w.escalationTimeoutHours ?? 24,
  } as WorkflowConfig);

  const load = React.useCallback(async () => {
    try {
      const data = (await dataStore.getApprovalWorkflows()) ?? [];
      if (Array.isArray(data) && data.length > 0) {
        const seen = new Set<string>();
        const mapped = data
          .filter((w: any) => {
            const type = w.type || w.name;
            if (seen.has(type)) return false;
            seen.add(type);
            return true;
          })
          .map((w: any) => mapWorkflow(w));
        setWorkflows(mapped);
        if (mapped.length > 0) {
          setSelectedWorkflow((prev) => prev && mapped.some((m) => m.type === prev.type) ? prev : mapped[0]);
        }
      } else {
        setWorkflows([]);
      }
      setSeedError(null);
    } catch (e) {
      console.error('Failed to load approval workflows', e);
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading && workflows.length === 0 && !seedingRef.current && !seedError) {
      seedingRef.current = true;
      seedDefaults();
    }
  }, [loading, workflows.length, seedError]);

  const seedDefaults = async () => {
    setSeedError(null);
    try {
      const existing = (await dataStore.getApprovalWorkflows()) ?? [];
      const existingTypes = new Set((existing as any[]).map((w) => w.type));
      for (const wf of DEFAULT_WORKFLOWS) {
        if (existingTypes.has(wf.type)) continue;
        await dataStore.addApprovalWorkflow({
          type: wf.type,
          name: wf.name,
          description: wf.description,
          steps: [],
          levels: wf.levels,
          isActive: wf.enabled,
          autoApprovalThreshold: wf.autoApprovalThreshold,
          escalationTimeoutHours: wf.escalationTimeout,
        });
        existingTypes.add(wf.type);
      }
      await load();
      toast.success('Default workflows created');
    } catch (e: any) {
      const msg = e?.message || (typeof e === 'string' ? e : 'Failed to create default workflows');
      console.error('Failed to seed workflows', e);
      toast.error(msg);
      setSeedError(msg);
      seedingRef.current = false;
    }
  };

  const normalizeLevelForPayload = (l: ApprovalLevel) => ({
    ...l,
    amountThreshold:
      l.amountThreshold === Infinity || l.amountThreshold >= SENTINEL_NO_LIMIT
        ? SENTINEL_NO_LIMIT
        : l.amountThreshold,
  });

  const handleSave = async () => {
    try {
      for (const wf of workflows) {
        const payload = {
          type: wf.type,
          name: wf.name,
          description: wf.description,
          steps: [],
          levels: wf.levels.map(normalizeLevelForPayload),
          isActive: wf.enabled,
          autoApprovalThreshold: wf.autoApprovalThreshold,
          escalationTimeoutHours: wf.escalationTimeout,
        };
        if (wf.id) {
          await dataStore.updateApprovalWorkflow(wf.id, payload);
        } else {
          await dataStore.addApprovalWorkflow(payload);
        }
      }
      toast.success('Approval workflows saved successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save workflows');
    }
  };

  const handleToggleWorkflow = (type: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.type !== type) return wf;
        const updated = { ...wf, enabled: !wf.enabled };
        if (selectedWorkflow?.type === type) {
          setSelectedWorkflow(updated);
        }
        return updated;
      })
    );
  };

  const handleUpdateWorkflow = (type: string, field: string, value: any) => {
    setWorkflows((prev) =>
      prev.map((wf) => (wf.type === type ? { ...wf, [field]: value } : wf))
    );
    if (selectedWorkflow?.type === type) {
      setSelectedWorkflow((prev) => (prev ? { ...prev, [field]: value } : null));
    }
  };

  const handleUpdateLevel = (type: string, levelIndex: number, field: string, value: any) => {
    const normalizedValue =
      field === 'amountThreshold' && (value === Infinity || value === '' || value == null)
        ? SENTINEL_NO_LIMIT
        : value;
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.type !== type) return wf;
        const newLevels = [...wf.levels];
        newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: normalizedValue };
        return { ...wf, levels: newLevels };
      })
    );
    if (selectedWorkflow?.type === type) {
      const newLevels = [...selectedWorkflow.levels];
      newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: normalizedValue };
      setSelectedWorkflow({ ...selectedWorkflow, levels: newLevels });
    }
  };

  const handleToggleRole = (type: string, levelIndex: number, role: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.type !== type) return wf;
        const newLevels = [...wf.levels];
        const currentRoles = newLevels[levelIndex].roles ?? [];
        const hasRole = currentRoles.includes(role);
        if (hasRole && currentRoles.length <= 1) return wf;
        newLevels[levelIndex] = {
          ...newLevels[levelIndex],
          roles: hasRole ? currentRoles.filter((r) => r !== role) : [...currentRoles, role],
        };
        const updated = { ...wf, levels: newLevels };
        if (selectedWorkflow?.type === type) {
          setSelectedWorkflow(updated);
        }
        return updated;
      })
    );
  };

  const handleToggleApprover = (type: string, levelIndex: number, userId: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.type !== type) return wf;
        const newLevels = [...wf.levels];
        const currentApprovers = newLevels[levelIndex].approvers ?? [];
        const hasUser = currentApprovers.includes(userId);
        newLevels[levelIndex] = {
          ...newLevels[levelIndex],
          approvers: hasUser ? currentApprovers.filter((id) => id !== userId) : [...currentApprovers, userId],
        };
        const updated = { ...wf, levels: newLevels };
        if (selectedWorkflow?.type === type) {
          setSelectedWorkflow(updated);
        }
        return updated;
      })
    );
  };

  const handleAddLevel = (type: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.type !== type) return wf;
        const maxLevel = Math.max(...wf.levels.map((l) => l.level), 0);
        const newLevel: ApprovalLevel = {
          level: maxLevel + 1,
          name: `Level ${maxLevel + 1}`,
          roles: ['admin'],
          approvers: [],
          amountThreshold: 0,
          required: true,
        };
        const updated = { ...wf, levels: [...wf.levels, newLevel] };
        if (selectedWorkflow?.type === type) {
          setSelectedWorkflow(updated);
        }
        return updated;
      })
    );
    toast.success('New approval level added');
  };

  const handleRemoveLevel = (type: string, levelIndex: number) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.type !== type) return wf;
        if (wf.levels.length <= 1) return wf;
        const newLevels = wf.levels.filter((_, i) => i !== levelIndex);
        const renumbered = newLevels.map((l, i) => ({ ...l, level: i + 1 }));
        return { ...wf, levels: renumbered };
      })
    );
    setSelectedWorkflow((prev) => {
      if (!prev || prev.type !== type) return prev;
      if (prev.levels.length <= 1) return prev;
      const newLevels = prev.levels.filter((_, i) => i !== levelIndex).map((l, i) => ({ ...l, level: i + 1 }));
      return { ...prev, levels: newLevels };
    });
    setEditingLevel(null);
    toast.success('Approval level removed');
  };

  const getRoleLabel = (roleId: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      project_manager: 'Project Manager',
      finance: 'Finance',
      employee: 'Employee',
    };
    if (labels[roleId]) return labels[roleId];
    const custom = customRoles.find((r: any) => r.id === roleId);
    return custom?.name ?? roleId;
  };

  const getUserName = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    return u?.name ?? 'Unknown User';
  };

  const isNoLimit = (v: number) => v >= SENTINEL_NO_LIMIT || v === Infinity;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A1516]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Approval Workflows Configuration</h3>
          <p className="text-sm text-gray-500">Configure multi-level approval workflows for different transaction types</p>
        </div>
        <Button onClick={handleSave} className="bg-[#7A1516] hover:bg-[#5A1012]">
          <Save className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      {workflows.length === 0 && seedError && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <p className="text-sm text-orange-800 mb-2">Could not load or create default workflows: {seedError}</p>
            <p className="text-xs text-orange-700 mb-4">Ensure migrations have been run (approval_workflows table exists with levels, auto_approval_threshold, escalation_timeout_hours columns).</p>
            <Button onClick={() => seedDefaults()} variant="outline" className="border-orange-300 text-orange-800 hover:bg-orange-100">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-700">Available Workflows</h4>
          {workflows.map((workflow) => (
            <Card
              key={workflow.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedWorkflow?.type === workflow.type ? 'ring-2 ring-[#7A1516]' : ''
              }`}
              onClick={() => setSelectedWorkflow(workflow)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {workflow.name}
                      {workflow.enabled ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Disabled</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">{workflow.description}</CardDescription>
                  </div>
                  <Switch
                    checked={workflow.enabled}
                    onCheckedChange={() => handleToggleWorkflow(workflow.type)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {workflow.levels.length} Level{workflow.levels.length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Auto-approve &lt; {workflow.autoApprovalThreshold.toLocaleString()} SAR
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedWorkflow && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workflow Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Auto-Approval Threshold (SAR)</Label>
                  <Input
                    type="number"
                    value={selectedWorkflow.autoApprovalThreshold}
                    onChange={(e) =>
                      handleUpdateWorkflow(selectedWorkflow.type, 'autoApprovalThreshold', Number(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500">
                    Transactions below this amount can be auto-approved by authorized roles
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Escalation Timeout (hours)</Label>
                  <Input
                    type="number"
                    value={selectedWorkflow.escalationTimeout}
                    onChange={(e) =>
                      handleUpdateWorkflow(selectedWorkflow.type, 'escalationTimeout', Number(e.target.value) || 24)
                    }
                    placeholder="24"
                  />
                  <p className="text-xs text-gray-500">
                    Time before pending approvals are escalated to next level
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approval Levels</CardTitle>
                <CardDescription className="text-xs">
                  Configure approval levels and amount thresholds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedWorkflow.levels.map((level, index) => (
                    <Card key={level.level} className="border-l-4 border-l-[#7A1516]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Level {level.level}</Badge>
                            <span className="font-semibold text-sm">{level.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {editingLevel === index && selectedWorkflow.levels.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLevel(selectedWorkflow.type, index);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLevel(editingLevel === index ? null : index);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {editingLevel === index ? (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs">Level Name</Label>
                              <Input
                                value={level.name}
                                onChange={(e) => handleUpdateLevel(selectedWorkflow.type, index, 'name', e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Amount Threshold (SAR)</Label>
                              <Input
                                type="number"
                                value={isNoLimit(level.amountThreshold) ? '' : level.amountThreshold}
                                onChange={(e) =>
                                  handleUpdateLevel(
                                    selectedWorkflow.type,
                                    index,
                                    'amountThreshold',
                                    e.target.value ? Number(e.target.value) : SENTINEL_NO_LIMIT
                                  )
                                }
                                placeholder="No limit"
                                className="h-8 text-sm"
                              />
                              <p className="text-xs text-gray-500">
                                This level applies when amount exceeds this threshold
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Assign Specific Roles
                              </Label>
                              <div className="border rounded-md p-3 space-y-3 bg-blue-50">
                                <p className="text-xs text-gray-600">
                                  Select which roles can approve at this level
                                </p>
                                {level.roles && level.roles.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {level.roles.map((roleId) => {
                                      const customRole = customRoles.find((r: any) => r.id === roleId);
                                      const isCustom = customRole?.isCustom;
                                      return (
                                        <Badge
                                          key={roleId}
                                          className="bg-blue-600 text-white text-xs flex items-center gap-1 px-2 py-1"
                                        >
                                          {getRoleLabel(roleId)}
                                          {isCustom && <span className="text-blue-200">(Custom)</span>}
                                          {level.roles.length > 1 && (
                                            <button
                                              type="button"
                                              className="ml-1 hover:bg-blue-700 rounded-full p-0.5 inline-flex items-center justify-center"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleToggleRole(selectedWorkflow.type, index, roleId);
                                              }}
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                                <Select
                                  value=""
                                  onValueChange={(roleId) => {
                                    if (roleId && !level.roles.includes(roleId)) {
                                      handleToggleRole(selectedWorkflow.type, index, roleId);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder="Add a role..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="px-2 py-1 text-xs font-semibold text-gray-500">Default Roles</div>
                                    {BUILTIN_ROLES.filter((r) => !level.roles?.includes(r)).map((r) => (
                                      <SelectItem key={r} value={r} className="text-xs">
                                        {getRoleLabel(r)}
                                      </SelectItem>
                                    ))}
                                    {customRoles.filter((r: any) => r.isCustom).length > 0 && (
                                      <>
                                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 border-t mt-1 pt-1">
                                          Custom Roles
                                        </div>
                                        {customRoles
                                          .filter((r: any) => r.isCustom && !level.roles?.includes(r.id))
                                          .map((r: any) => (
                                            <SelectItem key={r.id} value={r.id} className="text-xs">
                                              <div className="flex items-center gap-2">
                                                <span>{r.name}</span>
                                                <Badge variant="outline" className="text-xs">Custom</Badge>
                                              </div>
                                            </SelectItem>
                                          ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 italic">
                                  At least one role must be selected. Click the X to remove a role.
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Assign Specific Approvers
                              </Label>
                              <div className="border rounded-md p-3 space-y-3 bg-gray-50">
                                <p className="text-xs text-gray-600">
                                  Optionally assign individual users who can approve at this level
                                </p>
                                {level.approvers && level.approvers.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {level.approvers.map((approverId) => (
                                      <Badge
                                        key={approverId}
                                        className="bg-[#7A1516] text-white text-xs flex items-center gap-1 px-2 py-1"
                                      >
                                        {getUserName(approverId)}
                                        <button
                                          type="button"
                                          className="ml-1 hover:bg-[#5A1012] rounded-full p-0.5 inline-flex items-center justify-center"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleToggleApprover(selectedWorkflow.type, index, approverId);
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <Select
                                  value=""
                                  onValueChange={(userId) => {
                                    if (userId && !level.approvers?.includes(userId)) {
                                      handleToggleApprover(selectedWorkflow.type, index, userId);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder="Add an approver..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {users
                                      .filter((u) => !level.approvers?.includes(u.id))
                                      .map((u) => (
                                        <SelectItem key={u.id} value={u.id} className="text-xs">
                                          {u.name}
                                        </SelectItem>
                                      ))}
                                    {(!users.length || users.every((u) => level.approvers?.includes(u.id))) && (
                                      <div className="px-2 py-1 text-xs text-gray-500">
                                        {!users.length ? 'No users loaded' : 'All users assigned'}
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Required Level</Label>
                              <Switch
                                checked={level.required}
                                onCheckedChange={(checked) =>
                                  handleUpdateLevel(selectedWorkflow.type, index, 'required', checked)
                                }
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-600">Roles:</span>
                              <div className="flex flex-wrap gap-1">
                                {level.roles.map((role) => (
                                  <Badge key={role} variant="secondary" className="text-xs">
                                    {getRoleLabel(role)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {level.approvers && level.approvers.length > 0 && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-600 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  Assigned:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {level.approvers.map((approverId) => (
                                    <Badge key={approverId} className="bg-[#7A1516] text-white text-xs">
                                      {getUserName(approverId)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-600">Threshold:</span>
                              <Badge variant="outline" className="text-xs">
                                {isNoLimit(level.amountThreshold)
                                  ? 'No Limit'
                                  : `> ${level.amountThreshold.toLocaleString()} SAR`}
                              </Badge>
                              {level.required && (
                                <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLevel(selectedWorkflow.type)}
                    className="w-full border-dashed border-2 hover:border-[#7A1516] hover:bg-[#7A1516]/5 text-[#7A1516]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Approval Level
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedWorkflow && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center text-gray-400">
              <Settings2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a workflow to configure</p>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval Matrix Summary</CardTitle>
          <CardDescription className="text-xs">
            Quick reference for approval requirements by transaction amount
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>&lt; 10K SAR</TableHead>
                <TableHead>10K - 50K SAR</TableHead>
                <TableHead>50K - 100K SAR</TableHead>
                <TableHead>&gt; 100K SAR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows
                .filter((wf) => wf.enabled)
                .map((workflow) => {
                  const sortedLevels = [...workflow.levels].sort(
                    (a, b) =>
                      (isNoLimit(a.amountThreshold) ? SENTINEL_NO_LIMIT : a.amountThreshold) -
                      (isNoLimit(b.amountThreshold) ? SENTINEL_NO_LIMIT : b.amountThreshold)
                  );
                  const getApproverForAmount = (amount: number) => {
                    if (amount < workflow.autoApprovalThreshold) return 'Auto-approve';
                    const applicableLevels = sortedLevels.filter((lvl, idx) => {
                      if (isNoLimit(lvl.amountThreshold)) {
                        let prevFinite = 0;
                        for (let i = idx - 1; i >= 0; i--) {
                          if (!isNoLimit(sortedLevels[i].amountThreshold)) {
                            prevFinite = sortedLevels[i].amountThreshold;
                            break;
                          }
                        }
                        return amount >= prevFinite;
                      }
                      return amount >= lvl.amountThreshold;
                    });
                    if (applicableLevels.length === 0) return 'Auto-approve';
                    return applicableLevels
                      .map((lvl) => {
                        if (lvl.approvers && lvl.approvers.length > 0) {
                          return lvl.approvers.map((id) => getUserName(id)).join(', ');
                        }
                        return (lvl.roles ?? []).map((r) => getRoleLabel(r)).join(' or ');
                      })
                      .join(' + ');
                  };
                  return (
                    <TableRow key={workflow.type}>
                      <TableCell className="font-medium text-sm">{workflow.name}</TableCell>
                      <TableCell className="text-xs">{getApproverForAmount(5000)}</TableCell>
                      <TableCell className="text-xs">{getApproverForAmount(25000)}</TableCell>
                      <TableCell className="text-xs">{getApproverForAmount(75000)}</TableCell>
                      <TableCell className="text-xs">{getApproverForAmount(150000)}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
