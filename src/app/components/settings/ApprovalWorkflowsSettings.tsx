import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Save, DollarSign, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { dataStore } from '../../data/store';

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
  const [loading, setLoading] = useState(true);
  const seedingRef = React.useRef(false);

  useEffect(() => {
    const load = async () => {
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
            .map((w: any) => ({
              id: w.id,
              type: w.type,
              name: w.name,
              description: w.description || '',
              enabled: w.isActive !== false,
              levels: Array.isArray(w.levels) && w.levels.length > 0
                ? w.levels.map((l: any) => ({
                    level: l.level ?? 1,
                    name: l.name ?? '',
                    roles: l.roles ?? [],
                    approvers: l.approvers ?? [],
                    amountThreshold: l.amountThreshold ?? 0,
                    required: l.required !== false,
                  }))
                : [],
              autoApprovalThreshold: w.autoApprovalThreshold ?? 0,
              escalationTimeout: w.escalationTimeoutHours ?? 24,
            }));
          setWorkflows(mapped);
          if (mapped.length > 0 && !selectedWorkflow) setSelectedWorkflow(mapped[0]);
        } else {
          setWorkflows([]);
        }
      } catch (e) {
        console.error('Failed to load approval workflows', e);
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && workflows.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      seedDefaults();
    }
  }, [loading, workflows.length]);

  const seedDefaults = async () => {
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
      const data = (await dataStore.getApprovalWorkflows()) ?? [];
      const mapped = data.map((w: any) => ({
        id: w.id,
        type: w.type,
        name: w.name,
        description: w.description || '',
        enabled: w.isActive !== false,
        levels: Array.isArray(w.levels) ? w.levels.map((l: any) => ({
          level: l.level ?? 1,
          name: l.name ?? '',
          roles: l.roles ?? [],
          approvers: l.approvers ?? [],
          amountThreshold: l.amountThreshold ?? 0,
          required: l.required !== false,
        })) : [],
        autoApprovalThreshold: w.autoApprovalThreshold ?? 0,
        escalationTimeout: w.escalationTimeoutHours ?? 24,
      }));
      setWorkflows(mapped);
      if (mapped.length > 0) setSelectedWorkflow(mapped[0]);
      toast.success('Default workflows created');
    } catch (e) {
      console.error('Failed to seed workflows', e);
      toast.error('Failed to create default workflows');
    }
  };

  const handleSave = async () => {
    try {
      for (const wf of workflows) {
        const payload = {
          type: wf.type,
          name: wf.name,
          description: wf.description,
          steps: [],
          levels: wf.levels,
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
      prev.map((wf) => (wf.type === type ? { ...wf, enabled: !wf.enabled } : wf))
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
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.type !== type) return wf;
        const newLevels = [...wf.levels];
        newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: value };
        return { ...wf, levels: newLevels };
      })
    );
    if (selectedWorkflow?.type === type) {
      const newLevels = [...selectedWorkflow.levels];
      newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: value };
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
        return { ...wf, levels: newLevels };
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
        return { ...wf, levels: [...wf.levels, newLevel] };
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
    toast.success('Approval level removed');
  };

  const getRoleLabel = (roleId: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      project_manager: 'Project Manager',
      finance: 'Finance',
      employee: 'Employee',
    };
    return labels[roleId] ?? roleId;
  };

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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Approval Levels</CardTitle>
                <Button size="sm" onClick={() => handleAddLevel(selectedWorkflow.type)} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Level
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Threshold (SAR)</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedWorkflow.levels.map((level, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{level.level}</TableCell>
                        <TableCell>
                          <Input
                            value={level.name}
                            onChange={(e) => handleUpdateLevel(selectedWorkflow.type, idx, 'name', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(level.roles ?? []).map((r) => (
                              <Badge key={r} variant="secondary" className="text-xs">
                                {getRoleLabel(r)}
                              </Badge>
                            ))}
                            <Select
                              onValueChange={(v) => {
                                if (v && !(level.roles ?? []).includes(v)) handleToggleRole(selectedWorkflow.type, idx, v);
                              }}
                            >
                              <SelectTrigger className="w-28 h-7 text-xs">
                                <SelectValue placeholder="Add role" />
                              </SelectTrigger>
                              <SelectContent>
                                {BUILTIN_ROLES.filter((r) => !(level.roles ?? []).includes(r)).map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {getRoleLabel(r)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={level.amountThreshold}
                            onChange={(e) =>
                              handleUpdateLevel(selectedWorkflow.type, idx, 'amountThreshold', Number(e.target.value) || 0)
                            }
                            className="h-8 w-24"
                          />
                        </TableCell>
                        <TableCell>
                          {selectedWorkflow.levels.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveLevel(selectedWorkflow.type, idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
