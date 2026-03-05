import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePermissionsMatrix } from '../contexts/PermissionsMatrixContext';
import { useAuth } from '../contexts/AuthContext';
import { dataStore, Project, Vendor, Customer, PurchaseOrder, VendorInvoice, CustomerInvoice } from '../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, FolderKanban, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router';
import { Skeleton } from '../components/ui/skeleton';
import { AccessDenied } from '../components/AccessDenied';

export function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { hasPermission } = usePermissionsMatrix();
  const { user } = useAuth();
  const canViewDashboard = hasPermission('dashboard', 'view');
  const canViewFinancial = hasPermission('dashboard', 'view_financial');
  const canViewAllProjects = hasPermission('dashboard', 'view_all_projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [projectBudgetData, setProjectBudgetData] = useState<{ name: string; budget: number; spent: number }[]>([]);
  const [projectsWithProgress, setProjectsWithProgress] = useState<{ project: Project; budget: number; spent: number; progress: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, vendorsData, customersData, posData, vendorInvoicesData, customerInvoicesData] = await Promise.all([
          dataStore.getProjects(),
          dataStore.getVendors(),
          dataStore.getCustomers(),
          dataStore.getPurchaseOrders(),
          dataStore.getVendorInvoices(),
          dataStore.getCustomerInvoices(),
        ]);
        setProjects(projectsData);
        setVendors(vendorsData);
        setCustomers(customersData);
        setPurchaseOrders(posData);
        setVendorInvoices(vendorInvoicesData);
        setCustomerInvoices(customerInvoicesData);

        // Load all payments per project for revenue and per-project spent
        const paymentsArrays = await Promise.all(
          projectsData.map((project: Project) => dataStore.getPayments(project.id))
        );
        setPayments(paymentsArrays.flat());

        // Second pass: budget items + tasks for displayed projects (per Document: Budget = Sum(BudgetItems), Spent = Sum(Paid Vendor Payments), Progress = CompletedTasks/TotalTasks)
        const displayed = canViewAllProjects ? projectsData : projectsData.filter((p: Project) => isAssignedToProject(p));
        const forChartAndRecent = displayed.slice(0, 5);
        const budgetAndTasks = await Promise.all(
          forChartAndRecent.map(async (project: Project) => {
            const idx = projectsData.findIndex((p: Project) => p.id === project.id);
            const projectPayments = (idx >= 0 ? paymentsArrays[idx] : []) || [];
            const [budgetItems, tasks] = await Promise.all([
              dataStore.getBudgetItems(project.id),
              dataStore.getTasks(project.id),
            ]);
            const budget = budgetItems.reduce((sum, item) => sum + item.budgeted, 0);
            const paidPayments = projectPayments.filter((p: any) => p.type === 'payment' && (p.status === 'approved' || p.status === 'paid'));
            const spent = paidPayments.reduce((sum: number, p: any) => sum + (p.subtotal || p.amount || 0), 0);
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            return { project, budget, spent, progress };
          })
        );
        setProjectBudgetData(budgetAndTasks.map(({ project, budget, spent }) => ({
          name: project.code,
          budget,
          spent,
        })));
        setProjectsWithProgress(budgetAndTasks);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [canViewAllProjects, user?.id]);

  // Calculate KPIs - Use actual payments for revenue
  // Per Document: Revenue = Sum(CustomerPayments where status=Approved), Expenses = Sum(VendorPayments where status=Approved)
  const totalRevenue = payments
    .filter(p => p.type === 'receipt' && (p.status === 'approved' || p.status === 'paid'))
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const totalExpenses = payments
    .filter(p => p.type === 'payment' && (p.status === 'approved' || p.status === 'paid'))
    .reduce((sum, p) => sum + (p.subtotal || p.amount || 0), 0);
  
  const totalProfit = totalRevenue - totalExpenses;
  
  // Outstanding per Document: Customer Outstanding − Vendor Outstanding
  // Customer Outstanding = Customer Invoices − Customer Payments
  // Vendor Outstanding = Vendor Invoices − Vendor Payments (vendor obligations = POs + Invoices, per Expense tab logic)
  const totalCustomerInvoiced = customerInvoices
    .filter(inv => inv.status === 'approved' || inv.status === 'sent' || inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const customerOutstanding = totalCustomerInvoiced - totalRevenue;
  const getVendorInvoiceAmount = (inv: any) => (inv.total ?? (Number(inv.subtotal ?? 0) + Number(inv.vat ?? inv.vatAmount ?? 0))) ?? 0;
  const totalVendorInvoiced = vendorInvoices
    .filter(inv => inv.status === 'approved' || inv.status === 'paid')
    .reduce((sum, inv) => sum + getVendorInvoiceAmount(inv), 0);
  const totalPOValue = purchaseOrders
    .filter(po => ['approved', 'issued', 'received', 'partially_paid', 'paid'].includes(po.status))
    .reduce((sum, po) => sum + (po.total ?? po.subtotal ?? 0), 0);
  const totalVendorCommitted = totalPOValue + totalVendorInvoiced;
  const vendorOutstanding = totalVendorCommitted - totalExpenses;
  const netOutstanding = customerOutstanding - vendorOutstanding;

  // Percentage changes: this period (month-to-date) vs previous month (full month)
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const isBeforeStartOfThisMonth = (dateStr: string) => new Date(dateStr) < startOfThisMonth;

  const receiptsPaid = payments.filter(p => p.type === 'receipt' && (p.status === 'approved' || p.status === 'paid'));
  const paymentsPaid = payments.filter(p => p.type === 'payment' && (p.status === 'approved' || p.status === 'paid'));

  const prevRevenue = receiptsPaid
    .filter(p => isBeforeStartOfThisMonth(p.paymentDate))
    .reduce((sum, p) => sum + p.amount, 0);
  const prevExpenses = paymentsPaid
    .filter(p => isBeforeStartOfThisMonth(p.paymentDate))
    .reduce((sum, p) => sum + (p.subtotal || p.amount), 0);
  const prevProfit = prevRevenue - prevExpenses;

  const prevCustomerInvoiced = customerInvoices
    .filter(inv => (inv.status === 'approved' || inv.status === 'sent' || inv.status === 'paid') && isBeforeStartOfThisMonth(inv.issueDate))
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const prevReceived = receiptsPaid
    .filter(p => isBeforeStartOfThisMonth(p.paymentDate))
    .reduce((sum, p) => sum + p.amount, 0);
  const prevVendorInvoiced = vendorInvoices
    .filter(inv => (inv.status === 'approved' || inv.status === 'paid') && isBeforeStartOfThisMonth(inv.issueDate || inv.invoiceDate))
    .reduce((sum, inv) => sum + getVendorInvoiceAmount(inv), 0);
  const prevPOValue = purchaseOrders
    .filter(po => ['approved', 'issued', 'received', 'partially_paid', 'paid'].includes(po.status) && isBeforeStartOfThisMonth(po.issueDate || po.createdAt))
    .reduce((sum, po) => sum + (po.total ?? po.subtotal ?? 0), 0);
  const prevVendorPaid = paymentsPaid
    .filter(p => isBeforeStartOfThisMonth(p.paymentDate))
    .reduce((sum, p) => sum + (p.subtotal || p.amount), 0);
  const prevVendorOutstanding = (prevPOValue + prevVendorInvoiced) - prevVendorPaid;
  const prevOutstanding = (prevCustomerInvoiced - prevReceived) - prevVendorOutstanding;

  const formatPctChange = (current: number, previous: number, invertGood = false): { text: string; positive: boolean } => {
    if (previous === 0) {
      if (current === 0) return { text: '0%', positive: true };
      return { text: '+100%', positive: !invertGood };
    }
    const pct = ((current - previous) / previous) * 100;
    const rounded = Math.round(pct * 10) / 10;
    const text = rounded >= 0 ? `+${rounded}%` : `${rounded}%`;
    const positive = invertGood ? rounded <= 0 : rounded >= 0;
    return { text, positive };
  };

  const revenueChange = formatPctChange(totalRevenue, prevRevenue);
  const expensesChange = formatPctChange(totalExpenses, prevExpenses);
  const profitChange = formatPctChange(totalProfit, prevProfit);
  const outstandingChange = formatPctChange(netOutstanding, prevOutstanding, true);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-SA')} SAR`;
  };

  // Calculate monthly revenue/expenses trend from payments per Document (actual cash flow)
  const getMonthlyTrend = () => {
    const monthlyStats: { [key: string]: { revenue: number; expenses: number } } = {};
    
    payments.filter((p: any) => p.type === 'receipt' && (p.status === 'approved' || p.status === 'paid')).forEach((p: any) => {
      const date = new Date(p.paymentDate || p.paidDate || 0);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { revenue: 0, expenses: 0 };
      monthlyStats[monthKey].revenue += p.amount || 0;
    });

    payments.filter((p: any) => p.type === 'payment' && (p.status === 'approved' || p.status === 'paid')).forEach((p: any) => {
      const date = new Date(p.paymentDate || p.paidDate || 0);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { revenue: 0, expenses: 0 };
      monthlyStats[monthKey].expenses += p.subtotal || p.amount || 0;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      last6Months.push({
        month: monthName,
        revenue: monthlyStats[monthName]?.revenue || 0,
        expenses: monthlyStats[monthName]?.expenses || 0,
      });
    }
    return last6Months;
  };

  const trendData = getMonthlyTrend();

  // When View All Projects is OFF: show projects where user is assigned as manager OR is a team member
  const isAssignedToProject = (p: Project) => {
    if (!user?.id) return false;
    if (p.assignedManagerId === user.id) return true;
    return (p.teamMembers || []).some((m: { userId?: string }) => m.userId === user.id);
  };
  const displayedProjects = canViewAllProjects
    ? projects
    : projects.filter((p: Project) => isAssignedToProject(p));

  const projectStatusData = [
    { name: t('projects.status.active'), value: displayedProjects.filter(p => p.status === 'active').length, color: '#10b981' },
    { name: t('projects.status.planning'), value: displayedProjects.filter(p => p.status === 'planning').length, color: '#f59e0b' },
    { name: t('projects.status.on_hold'), value: displayedProjects.filter(p => p.status === 'on_hold').length, color: '#ef4444' },
    { name: t('projects.status.completed'), value: displayedProjects.filter(p => p.status === 'completed').length, color: '#3b82f6' },
  ];
  const projectStatusPieData = projectStatusData.filter(d => d.value > 0);

  const kpis = [
    {
      title: t('dashboard.revenue'),
      value: formatCurrency(totalRevenue),
      change: revenueChange.text,
      positive: revenueChange.positive,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
    },
    {
      title: t('dashboard.expenses'),
      value: formatCurrency(totalExpenses),
      change: expensesChange.text,
      positive: !expensesChange.positive,
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'bg-red-500',
    },
    {
      title: t('dashboard.profit'),
      value: formatCurrency(totalProfit),
      change: profitChange.text,
      positive: profitChange.positive,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-blue-500',
    },
    {
      title: t('dashboard.outstanding'),
      value: formatCurrency(netOutstanding),
      change: outstandingChange.text,
      positive: outstandingChange.positive,
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'bg-orange-500',
    },
  ];

  if (!canViewDashboard) {
    return <AccessDenied message="You don't have permission to view the dashboard." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-1">{t('dashboard.welcome')}</p>
        </div>

        {/* KPI skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="w-12 h-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-[300px] w-full rounded-lg" /></CardContent>
            </Card>
          ))}
          <Card className="lg:col-span-2">
            <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full rounded-lg" /></CardContent>
          </Card>
        </div>

        {/* Recent projects skeleton */}
        <Card>
            <CardHeader><CardTitle>{t('dashboard.recentProjects')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2 w-48 rounded-full" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-24 ml-auto" />
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-gray-500 mt-1">{t('dashboard.welcome')}</p>
      </div>

      {/* KPI Cards - requires view_financial */}
      {canViewFinancial && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className={`text-sm mt-2 flex items-center gap-1 ${kpi.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {kpi.change}
                  </p>
                </div>
                <div className={`w-12 h-12 ${kpi.color} text-white rounded-lg flex items-center justify-center`}>
                  {kpi.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#7A1516] text-white rounded-lg flex items-center justify-center">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.activeProjects')}</p>
                <p className="text-2xl font-bold">{displayedProjects.filter(p => p.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.totalVendors')}</p>
                <p className="text-2xl font-bold">{vendors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 text-white rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.totalCustomers')}</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.projectStatusDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusPieData.length > 0 ? projectStatusPieData : projectStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(projectStatusPieData.length > 0 ? projectStatusPieData : projectStatusData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, `${name}: ${value}`]} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  payload={projectStatusData.map((entry) => ({
                    value: `${entry.name}: ${entry.value}`,
                    type: 'square',
                    color: entry.color,
                  }))}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget vs Actual - requires view_financial */}
        {canViewFinancial && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.budgetVsActual')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectBudgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="budget" fill="#7A1516" name={t('common.budget')} />
                <Bar dataKey="spent" fill="#3b82f6" name={t('common.spent')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        )}

        {/* Revenue & Expenses Trend - requires view_financial */}
        {canViewFinancial && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('dashboard.revenueExpensesTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name={t('dashboard.revenue')} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name={t('dashboard.expenses')} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Recent Projects - Progress = CompletedTasks/TotalTasks per Document */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentProjects')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectsWithProgress.map(({ project, budget, spent, progress }) => {
              const customer = customers.find(c => c.id === project.customerId);
              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{project.name}</h3>
                      <span className={
                        project.status === 'active' ? 'px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded' :
                        project.status === 'planning' ? 'px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded' :
                        project.status === 'completed' ? 'px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded' :
                        'px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded'
                      }>
                        {project.status}
                      </span>
                    </div>
                    {customer && (
                      <p className="text-sm text-gray-500 mt-1">{customer.name}</p>
                    )}
                    <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                      <div className="bg-[#7A1516] h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(budget)}</p>
                    <p className="text-xs text-gray-500">{progress.toFixed(1)}% complete</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}