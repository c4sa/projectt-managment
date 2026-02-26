import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { dataStore, ProjectStatus, Project } from '../data/store';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Calendar, DollarSign, Users, FileText, Building2, Mail, Phone, MapPin, FileCheck, ExternalLink, Edit2, Save, X, Upload, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { ProjectTasksTab } from '../components/project/ProjectTasksTab';
import { ProjectBudgetTab } from '../components/project/ProjectBudgetTab';
import { ProjectDocumentsTab } from '../components/project/ProjectDocumentsTab';
import { ProjectInformationTab } from '../components/project/ProjectInformationTab';
import { ProjectExpensesTab } from '../components/project/ProjectExpensesTab';
import { ProjectManpowerTab } from '../components/project/ProjectManpowerTab';
import { ProjectIncomeTab } from '../components/project/ProjectIncomeTab';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('information');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Financial data for calculating budget and spent
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [totalReserved, setTotalReserved] = useState(0);
  const [totalActualSpent, setTotalActualSpent] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      try {
        const [projectData, allCustomers] = await Promise.all([
          dataStore.getProjectAsync(id!),
          dataStore.getCustomers(),
        ]);
        setProject(projectData);
        if (projectData?.customerId) {
          setCustomer(allCustomers.find((c: any) => c.id === projectData.customerId) || null);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadProject();
    }
  }, [id, refreshKey]);

  // Load and calculate financial data
  useEffect(() => {
    const loadFinancialData = async () => {
      if (!id) return;
      
      const [budgetItems, purchaseOrders, payments, vendorInvoices, variationOrders, tasksData] = await Promise.all([
        dataStore.getBudgetItems(id),
        dataStore.getPurchaseOrders(id),
        dataStore.getPayments(id),
        dataStore.getVendorInvoices(),
        dataStore.getVariationOrders(),
        dataStore.getTasks(id),
      ]);
      setTasks(tasksData);
      const projectInvoices = vendorInvoices.filter((inv: any) => inv.projectId === id);
      const projectVOs = variationOrders.filter((vo: any) => {
        const po = purchaseOrders.find((p: any) => p.id === vo.poId);
        return po && po.projectId === id;
      });
      
      // Calculate total budgeted
      const budgeted = budgetItems.reduce((sum, item) => sum + item.budgeted, 0);
      setTotalBudgeted(budgeted);
      
      // Calculate total reserved (approved POs + approved invoices + approved VOs)
      let reserved = 0;
      
      // Committed POs: approved, issued, received, partially_paid, or paid
      purchaseOrders.forEach((po: any) => {
        if (['approved', 'issued', 'received', 'partially_paid', 'paid'].includes(po.status)) {
          reserved += po.subtotal || 0;
        }
      });

      // Committed invoices: pending, approved, sent, or paid (no 'partially_paid' in invoice status)
      projectInvoices.forEach((inv: any) => {
        if (['pending', 'approved', 'sent', 'paid'].includes(inv.status)) {
          reserved += inv.subtotal || 0;
        }
      });
      
      // Approved VOs
      projectVOs.forEach((vo: any) => {
        if (vo.status === 'approved') {
          reserved += vo.totalAmount || 0;
        }
      });
      
      setTotalReserved(reserved);
      
      // Calculate total actual spent (only PAID payments)
      const paidPayments = payments.filter((p: any) => p.type === 'payment' && p.status === 'paid');
      const actualSpent = paidPayments.reduce((sum: number, p: any) => sum + (p.subtotal || p.amount), 0);
      setTotalActualSpent(actualSpent);
    };
    
    loadFinancialData();
  }, [id, refreshKey, activeTab]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.status-dropdown-container')) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showStatusDropdown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A1516] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
        </div>
      </div>
    );
  }

  const progress = totalBudgeted > 0 ? (totalActualSpent / totalBudgeted) * 100 : 0;

  const handleStatusChange = (newStatus: ProjectStatus) => {
    dataStore.updateProject(project.id, { status: newStatus });
    setShowStatusDropdown(false);
    setRefreshKey(prev => prev + 1); // Force re-render
  };

  // Calculate contract value breakdown
  const calculateContractBreakdown = () => {
    if (!project.contractValue) return null;
    
    const contractValue = project.contractValue;
    const VAT_RATE = 0.15;

    if (project.vatStatus === 'not_applicable') {
      return {
        total: contractValue,
        subtotal: contractValue,
        vatAmount: 0,
        label: 'Not Applicable'
      };
    } else if (project.vatStatus === 'inclusive') {
      const valueWithoutVAT = contractValue / 1.15;
      const vatAmount = contractValue - valueWithoutVAT;
      return {
        total: contractValue,
        subtotal: valueWithoutVAT,
        vatAmount: vatAmount,
        label: 'VAT Inclusive'
      };
    } else if (project.vatStatus === 'exclusive') {
      const vatAmount = contractValue * VAT_RATE;
      const total = contractValue + vatAmount;
      return {
        total: total,
        subtotal: contractValue,
        vatAmount: vatAmount,
        label: 'VAT Exclusive'
      };
    }
    return null;
  };

  const contractBreakdown = calculateContractBreakdown();

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'planning': return 'bg-yellow-100 text-yellow-700';
      case 'on_hold': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            
            {/* Clickable Status Dropdown */}
            <div className="relative status-dropdown-container">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={`${getStatusColor(project.status)} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer`}
              >
                {project.status.replace('_', ' ')}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]">
                  <div className="p-1">
                    <button
                      onClick={() => handleStatusChange('planning')}
                      className="w-full text-left px-3 py-2 rounded hover:bg-yellow-50 flex items-center gap-2 text-sm"
                    >
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Planning
                    </button>
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="w-full text-left px-3 py-2 rounded hover:bg-green-50 flex items-center gap-2 text-sm"
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Active
                    </button>
                    <button
                      onClick={() => handleStatusChange('on_hold')}
                      className="w-full text-left px-3 py-2 rounded hover:bg-red-50 flex items-center gap-2 text-sm"
                    >
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      On Hold
                    </button>
                    <button
                      onClick={() => handleStatusChange('completed')}
                      className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 flex items-center gap-2 text-sm"
                    >
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Completed
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-500">{project.code}</p>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="font-semibold">{totalBudgeted.toLocaleString()} SAR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Actual Spent</p>
                <p className="font-semibold">{totalActualSpent.toLocaleString()} SAR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Team Members</p>
                <p className="font-semibold">{project.teamMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <p className="font-semibold">{progress.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="manpower">Manpower</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

        <TabsContent value="information" className="mt-6">
          <ProjectInformationTab project={project} />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <ProjectBudgetTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <ProjectExpensesTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <ProjectIncomeTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="manpower" className="mt-6">
          <ProjectManpowerTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <ProjectDocumentsTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <ProjectTasksTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="gantt" className="mt-6">
          {(() => {
            const projectStart = project.startDate ? new Date(project.startDate) : new Date();
            const projectEnd = project.endDate ? new Date(project.endDate) : new Date(projectStart.getTime() + 90 * 24 * 60 * 60 * 1000);
            const totalDays = Math.max(1, Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)));

            const tasksWithDates = tasks.filter(t => t.dueDate);
            const statusColors: Record<string, string> = {
              todo: 'bg-gray-400',
              in_progress: 'bg-blue-500',
              review: 'bg-yellow-500',
              done: 'bg-green-500',
            };
            const statusLabels: Record<string, string> = {
              todo: 'To Do',
              in_progress: 'In Progress',
              review: 'Review',
              done: 'Done',
            };
            const priorityColors: Record<string, string> = {
              low: 'text-gray-500',
              medium: 'text-yellow-600',
              high: 'text-orange-600',
              urgent: 'text-red-600',
            };

            // Generate month headers
            const months: { label: string; days: number }[] = [];
            const cursor = new Date(projectStart);
            cursor.setDate(1);
            while (cursor <= projectEnd) {
              const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
              const startDay = cursor <= projectStart ? (projectStart.getDate() - 1) : 0;
              const endDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0) > projectEnd
                ? projectEnd.getDate()
                : daysInMonth;
              months.push({
                label: cursor.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                days: endDay - startDay,
              });
              cursor.setMonth(cursor.getMonth() + 1);
            }

            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>Gantt Chart</CardTitle>
                      <div className="flex items-center gap-4 text-sm">
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <span key={k} className="flex items-center gap-1">
                            <span className={`inline-block w-3 h-3 rounded-sm ${statusColors[k]}`}></span>
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Project timeline: {projectStart.toLocaleDateString()} – {projectEnd.toLocaleDateString()} ({totalDays} days)
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {tasksWithDates.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 px-6">
                        <Calendar className="w-12 h-12 mb-3" />
                        <p className="text-lg font-medium">No tasks with due dates</p>
                        <p className="text-sm mt-1">Add tasks with due dates in the Tasks tab to see them on the Gantt chart</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div style={{ minWidth: `${Math.max(800, totalDays * 18 + 220)}px` }}>
                          {/* Header row */}
                          <div className="flex border-b bg-gray-50">
                            <div className="w-56 shrink-0 px-4 py-2 text-xs font-semibold text-gray-600 border-r">Task</div>
                            <div className="flex-1 flex">
                              {months.map((m, i) => (
                                <div
                                  key={i}
                                  className="text-xs font-semibold text-gray-600 py-2 px-1 border-r text-center"
                                  style={{ width: `${(m.days / totalDays) * 100}%`, minWidth: `${m.days * 18}px` }}
                                >
                                  {m.label}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Task rows */}
                          {tasksWithDates.map((task, idx) => {
                            const dueDate = new Date(task.dueDate!);
                            // Estimate start as 3 days before due or project start
                            const estimatedStart = new Date(Math.max(projectStart.getTime(), dueDate.getTime() - 3 * 24 * 60 * 60 * 1000));
                            const startOffset = Math.max(0, Math.ceil((estimatedStart.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)));
                            const duration = Math.max(1, Math.ceil((dueDate.getTime() - estimatedStart.getTime()) / (24 * 60 * 60 * 1000)));
                            const leftPct = (startOffset / totalDays) * 100;
                            const widthPct = Math.min((duration / totalDays) * 100, 100 - leftPct);

                            return (
                              <div key={task.id} className={`flex border-b hover:bg-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                                <div className="w-56 shrink-0 px-4 py-3 border-r">
                                  <p className="text-sm font-medium truncate">{task.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs font-medium ${priorityColors[task.priority] || 'text-gray-500'}`}>
                                      {task.priority}
                                    </span>
                                    <span className="text-xs text-gray-400">Due {dueDate.toLocaleDateString('en-SA', { month: 'short', day: 'numeric' })}</span>
                                  </div>
                                </div>
                                <div className="flex-1 relative py-3 px-0" style={{ minHeight: '52px' }}>
                                  {/* Today marker */}
                                  {(() => {
                                    const todayOffset = Math.ceil((new Date().getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000));
                                    if (todayOffset >= 0 && todayOffset <= totalDays) {
                                      return (
                                        <div
                                          className="absolute top-0 bottom-0 w-px bg-red-400 opacity-50 z-10"
                                          style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  {/* Task bar */}
                                  <div
                                    className={`absolute top-1/2 -translate-y-1/2 h-6 rounded ${statusColors[task.status] || 'bg-gray-400'} flex items-center px-2`}
                                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                                    title={`${task.title} — ${statusLabels[task.status]}`}
                                  >
                                    <span className="text-white text-xs font-medium truncate">{task.title}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Today line label */}
                          <div className="flex border-t bg-gray-50 py-2">
                            <div className="w-56 shrink-0 px-4 text-xs text-gray-500 border-r">
                              Today: {new Date().toLocaleDateString()}
                            </div>
                            <div className="flex-1"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Task count summary */}
                {tasks.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(statusLabels).map(([status, label]) => {
                      const count = tasks.filter(t => t.status === status).length;
                      return (
                        <Card key={status}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-sm ${statusColors[status]}`}></span>
                              <span className="text-sm text-gray-500">{label}</span>
                            </div>
                            <div className="text-2xl font-bold mt-1">{count}</div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}