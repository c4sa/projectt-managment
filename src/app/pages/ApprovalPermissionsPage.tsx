import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { dataStore } from '../data/store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { GripVertical, Plus, Trash2, AlertCircle, Shield, Save, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';

export type ApprovalType = 'purchase_order' | 'vendor_invoice' | 'payment' | 'budget_change';

export interface ApprovalStep {
  id: string;
  order: number;
  role: string;
  condition?: {
    field: 'amount' | 'project_type' | 'department';
    operator: '>' | '<' | '=' | '>=';
    value: string | number;
  };
  required: boolean;
}

export interface ApprovalWorkflow {
  id: string;
  type: ApprovalType;
  name: string;
  description: string;
  steps: ApprovalStep[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const DND_ITEM_TYPE = 'APPROVAL_STEP';

interface DraggableStepProps {
  step: ApprovalStep;
  index: number;
  moveStep: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (stepId: string) => void;
  onEdit: (step: ApprovalStep) => void;
  isReadOnly: boolean;
}

function DraggableStep({ step, index, moveStep, onRemove, onEdit, isReadOnly }: DraggableStepProps) {
  const { t } = useLanguage();

  const [{ isDragging }, drag] = useDrag({
    type: DND_ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isReadOnly,
  });

  const [, drop] = useDrop({
    accept: DND_ITEM_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveStep(item.index, index);
        item.index = index;
      }
    },
    canDrop: () => !isReadOnly,
  });

  return (
    <div
      ref={(node) => !isReadOnly && drag(drop(node))}
      className={`group flex items-center gap-3 p-4 bg-white border rounded-lg transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${!isReadOnly ? 'cursor-move hover:border-[#7A1516] hover:shadow-md' : 'cursor-default'}`}
    >
      {!isReadOnly && <GripVertical className="w-5 h-5 text-gray-400" />}

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono">
            {t('approvals.step')} {step.order}
          </Badge>
          <Badge className="bg-[#7A1516]">{step.role}</Badge>
          {step.required && (
            <Badge variant="secondary">{t('approvals.required')}</Badge>
          )}
        </div>

        {step.condition && (
          <p className="text-sm text-gray-600 mt-1">
            {t('approvals.condition')}: {step.condition.field} {step.condition.operator} {step.condition.value}
          </p>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => onEdit(step)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(step.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface StepDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (step: Partial<ApprovalStep>) => void;
  editingStep?: ApprovalStep | null;
  nextOrder: number;
}

function StepDialog({ open, onClose, onSave, editingStep, nextOrder }: StepDialogProps) {
  const { t } = useLanguage();
  const [role, setRole] = useState(editingStep?.role || 'admin');
  const [required, setRequired] = useState(editingStep?.required ?? true);
  const [hasCondition, setHasCondition] = useState(!!editingStep?.condition);
  const [conditionField, setConditionField] = useState(editingStep?.condition?.field || 'amount');
  const [conditionOperator, setConditionOperator] = useState(editingStep?.condition?.operator || '>');
  const [conditionValue, setConditionValue] = useState(editingStep?.condition?.value?.toString() || '');

  useEffect(() => {
    if (open) {
      setRole(editingStep?.role || 'admin');
      setRequired(editingStep?.required ?? true);
      setHasCondition(!!editingStep?.condition);
      setConditionField(editingStep?.condition?.field || 'amount');
      setConditionOperator(editingStep?.condition?.operator || '>');
      setConditionValue(editingStep?.condition?.value?.toString() || '');
    }
  }, [open, editingStep]);

  const handleSave = () => {
    const stepData: Partial<ApprovalStep> = {
      ...(editingStep && { id: editingStep.id }),
      role,
      required,
      order: editingStep?.order ?? nextOrder,
    };

    if (hasCondition && conditionValue) {
      stepData.condition = {
        field: conditionField,
        operator: conditionOperator,
        value: conditionField === 'amount' ? parseFloat(conditionValue) : conditionValue,
      };
    }

    onSave(stepData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingStep ? t('approvals.editStep') : t('approvals.addStep')}
          </DialogTitle>
          <DialogDescription>{t('approvals.stepDialogDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('approvals.approverRole')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                <SelectItem value="project_manager">{t('roles.projectManager')}</SelectItem>
                <SelectItem value="finance">{t('roles.finance')}</SelectItem>
                <SelectItem value="ceo">{t('roles.ceo')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="required">{t('approvals.requiredApproval')}</Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasCondition"
              checked={hasCondition}
              onChange={(e) => setHasCondition(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="hasCondition">{t('approvals.addCondition')}</Label>
          </div>

          {hasCondition && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label>{t('approvals.conditionField')}</Label>
                <Select value={conditionField} onValueChange={(v) => setConditionField(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">{t('approvals.amount')}</SelectItem>
                    <SelectItem value="project_type">{t('approvals.projectType')}</SelectItem>
                    <SelectItem value="department">{t('approvals.department')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('approvals.operator')}</Label>
                  <Select value={conditionOperator} onValueChange={(v) => setConditionOperator(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">{'>'}</SelectItem>
                      <SelectItem value="<">{'<'}</SelectItem>
                      <SelectItem value=">=">{'>='}</SelectItem>
                      <SelectItem value="=">{'='}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('approvals.value')}</Label>
                  <Input
                    type={conditionField === 'amount' ? 'number' : 'text'}
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder={conditionField === 'amount' ? '50000' : 'Value'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} className="bg-[#7A1516] hover:bg-[#5A1012]">
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const WORKFLOW_TYPE_LABELS: Record<ApprovalType, string> = {
  purchase_order: 'Purchase Order',
  vendor_invoice: 'Vendor Invoice',
  payment: 'Payment',
  budget_change: 'Budget Change',
};

export function ApprovalPermissionsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';

  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ApprovalStep | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let data: any[] = await dataStore.getApprovalWorkflows() ?? [];
      // Seed 4 default workflows if table is empty (per COMPREHENSIVE_SYSTEM_DOCUMENTATION)
      if (data.length === 0) {
        const defaults: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>[] = [
          { type: 'purchase_order', name: 'Purchase Order Approval', description: 'Standard approval flow for purchase orders', steps: [
            { id: 's1', order: 1, role: 'project_manager', required: true },
            { id: 's2', order: 2, role: 'finance', required: true, condition: { field: 'amount', operator: '>', value: 10000 } },
            { id: 's3', order: 3, role: 'ceo', required: true, condition: { field: 'amount', operator: '>', value: 50000 } },
          ], isActive: true },
          { type: 'vendor_invoice', name: 'Vendor Invoice Approval', description: 'Approval flow for vendor invoices', steps: [
            { id: 's4', order: 1, role: 'finance', required: true },
            { id: 's5', order: 2, role: 'admin', required: true, condition: { field: 'amount', operator: '>', value: 25000 } },
          ], isActive: true },
          { type: 'payment', name: 'Payment Approval', description: 'Approval flow for payment requests', steps: [
            { id: 's6', order: 1, role: 'finance', required: true },
            { id: 's7', order: 2, role: 'ceo', required: true },
          ], isActive: true },
          { type: 'budget_change', name: 'Budget Change Approval', description: 'Approval flow for budget changes', steps: [
            { id: 's8', order: 1, role: 'project_manager', required: true },
            { id: 's9', order: 2, role: 'admin', required: true },
          ], isActive: true },
        ];
        for (const w of defaults) {
          const created = await dataStore.addApprovalWorkflow(w);
          data = [...data, created];
        }
      }
      if (!mounted) return;
      const mapped: ApprovalWorkflow[] = (data ?? []).map((w: any) => ({
        id: w.id,
        type: w.type,
        name: w.name ?? WORKFLOW_TYPE_LABELS[w.type] ?? w.type,
        description: w.description ?? '',
        steps: Array.isArray(w.steps) ? w.steps : [],
        isActive: w.isActive ?? true,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      }));
      setWorkflows(mapped);
      if (mapped.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(mapped[0]);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (workflows.length > 0 && selectedWorkflow) {
      const updated = workflows.find((w) => w.id === selectedWorkflow.id);
      if (updated) setSelectedWorkflow(updated);
    }
  }, [workflows]);

  const moveStep = (dragIndex: number, hoverIndex: number) => {
    if (!selectedWorkflow || !isAdmin) return;

    const updatedSteps = [...selectedWorkflow.steps];
    const [draggedStep] = updatedSteps.splice(dragIndex, 1);
    updatedSteps.splice(hoverIndex, 0, draggedStep);

    const reorderedSteps = updatedSteps.map((step, index) => ({
      ...step,
      order: index + 1,
    }));

    setSelectedWorkflow({
      ...selectedWorkflow,
      steps: reorderedSteps,
    });
  };

  const handleRemoveStep = (stepId: string) => {
    if (!selectedWorkflow || !isAdmin) return;

    const updatedSteps = selectedWorkflow.steps
      .filter((s) => s.id !== stepId)
      .map((step, index) => ({ ...step, order: index + 1 }));

    setSelectedWorkflow({
      ...selectedWorkflow,
      steps: updatedSteps,
    });

    toast.success(t('approvals.stepRemoved'));
  };

  const handleSaveStep = (stepData: Partial<ApprovalStep>) => {
    if (!selectedWorkflow || !isAdmin) return;

    let updatedSteps: ApprovalStep[];

    if (editingStep) {
      updatedSteps = selectedWorkflow.steps.map((s) =>
        s.id === editingStep.id ? { ...s, ...stepData } : s
      );
    } else {
      const newStep: ApprovalStep = {
        id: `s${Date.now()}`,
        order: selectedWorkflow.steps.length + 1,
        role: stepData.role || 'admin',
        required: stepData.required ?? true,
        ...(stepData.condition && { condition: stepData.condition }),
      };
      updatedSteps = [...selectedWorkflow.steps, newStep];
    }

    setSelectedWorkflow({
      ...selectedWorkflow,
      steps: updatedSteps,
    });

    setEditingStep(null);
    setStepDialogOpen(false);
    toast.success(editingStep ? t('approvals.stepUpdated') : t('approvals.stepAdded'));
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow || !isAdmin) return;

    try {
      await dataStore.updateApprovalWorkflow(selectedWorkflow.id, {
        steps: selectedWorkflow.steps,
        updatedAt: new Date().toISOString(),
      });
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === selectedWorkflow.id
            ? { ...selectedWorkflow, updatedAt: new Date().toISOString() }
            : w
        )
      );
      toast.success(t('approvals.workflowSaved'));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save workflow');
    }
  };

  const workflowTypeLabels: Record<ApprovalType, string> = {
    purchase_order: t('approvals.purchaseOrder'),
    vendor_invoice: t('approvals.vendorInvoice'),
    payment: t('approvals.payment'),
    budget_change: t('approvals.budgetChange'),
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t('approvals.noPermission')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500">Loading workflows...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-[#7A1516]" />
            <h1 className="text-2xl font-bold">{t('approvals.title')}</h1>
          </div>
          <p className="text-gray-600">{t('approvals.description')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{t('approvals.workflows')}</CardTitle>
                <CardDescription>{t('approvals.selectWorkflow')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedWorkflow?.id === workflow.id
                        ? 'border-[#7A1516] bg-[#7A1516]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-sm">
                        {workflowTypeLabels[workflow.type] ?? workflow.name}
                      </span>
                      {workflow.isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {t('approvals.active')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{workflow.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {workflow.steps.length} {t('approvals.steps')}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedWorkflow ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>
                        {workflowTypeLabels[selectedWorkflow.type] ?? selectedWorkflow.name}
                      </CardTitle>
                      <CardDescription>{selectedWorkflow.description}</CardDescription>
                    </div>
                    {isAdmin && (
                      <Button
                        onClick={handleSaveWorkflow}
                        className="bg-[#7A1516] hover:bg-[#5A1012]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {t('common.save')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {selectedWorkflow.steps.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {t('approvals.noSteps')}
                      </div>
                    ) : (
                      selectedWorkflow.steps.map((step, index) => (
                        <DraggableStep
                          key={step.id}
                          step={step}
                          index={index}
                          moveStep={moveStep}
                          onRemove={handleRemoveStep}
                          onEdit={(s) => {
                            setEditingStep(s);
                            setStepDialogOpen(true);
                          }}
                          isReadOnly={!isAdmin}
                        />
                      ))
                    )}
                  </div>

                  {isAdmin && (
                    <Button
                      onClick={() => {
                        setEditingStep(null);
                        setStepDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('approvals.addStep')}
                    </Button>
                  )}

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      {t('approvals.howItWorks')}
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>{t('approvals.dragToReorder')}</li>
                      <li>{t('approvals.stepsExecutedInOrder')}</li>
                      <li>{t('approvals.conditionsOptional')}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  {t('approvals.selectWorkflowToEdit')}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <StepDialog
          open={stepDialogOpen}
          onClose={() => {
            setStepDialogOpen(false);
            setEditingStep(null);
          }}
          onSave={handleSaveStep}
          editingStep={editingStep}
          nextOrder={(selectedWorkflow?.steps.length || 0) + 1}
        />
      </div>
    </DndProvider>
  );
}
