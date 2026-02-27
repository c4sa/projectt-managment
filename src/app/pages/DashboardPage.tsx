import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { dataStore, Project, Vendor, Customer, PurchaseOrder, VendorInvoice, CustomerInvoice } from '../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, FolderKanban, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router';
import { Skeleton } from '../components/ui/skeleton';

export function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
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
        setIsLoading(false);

        // Load all payments for revenue calculation (after showing the page)
        const paymentsArrays = await Promise.all(
          projectsData.map((project: Project) => dataStore.getPayments(project.id))
        );
        setPayments(paymentsArrays.flat());
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate KPIs - Use actual payments for revenue
  const totalRevenue = payments
    .filter(p => p.type === 'receipt' && p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalExpenses = payments
    .filter(p => p.type === 'payment' && p.status === 'paid')
    .reduce((sum, p) => sum + (p.subtotal || p.amount), 0);
  
  const totalProfit = totalRevenue - totalExpenses;
  
  // Outstanding receivables (invoiced but not yet paid by customers)
  const totalInvoiced = customerInvoices
    .filter(inv => inv.status !== 'draft')
    .reduce((sum, inv) => sum + inv.total, 0);
  const outstandingReceivables = totalInvoiced - totalRevenue;

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-SA')} SAR`;
  };

  // Project status distribution
  const projectStatusData = [
    { name: 'Active', value: projects.filter(p => p.status === 'active').length, color: '#10b981' },
    { name: 'Planning', value: projects.filter(p => p.status === 'planning').length, color: '#f59e0b' },
    { name: 'On Hold', value: projects.filter(p => p.status === 'on_hold').length, color: '#ef4444' },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: '#3b82f6' },
  ];

  // Budget vs Actual by project
  const projectBudgetData = projects.slice(0, 5).map(project => ({
    name: project.code,
    budget: project.budget,
    spent: project.spent,
  }));

  // Calculate monthly revenue/expenses trend from real invoice data
  const getMonthlyTrend = () => {
    const monthlyStats: { [key: string]: { revenue: number; expenses: number } } = {};
    
    // Process customer invoices (revenue)
    customerInvoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { revenue: 0, expenses: 0 };
      }
      monthlyStats[monthKey].revenue += inv.total;
    });

    // Process vendor invoices (expenses)
    vendorInvoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { revenue: 0, expenses: 0 };
      }
      monthlyStats[monthKey].expenses += inv.total;
    });

    // Convert to array format for charts (last 6 months)
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

  const kpis = [
    {
      title: t('dashboard.revenue'),
      value: formatCurrency(totalRevenue),
      change: '+12.5%',
      positive: true,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
    },
    {
      title: t('dashboard.expenses'),
      value: formatCurrency(totalExpenses),
      change: '+8.2%',
      positive: false,
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'bg-red-500',
    },
    {
      title: t('dashboard.profit'),
      value: formatCurrency(totalProfit),
      change: '+15.3%',
      positive: true,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-blue-500',
    },
    {
      title: t('dashboard.outstanding'),
      value: formatCurrency(outstandingReceivables),
      change: '-5.1%',
      positive: true,
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'bg-orange-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with your projects.</p>
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
          <CardHeader><CardTitle>Recent Projects</CardTitle></CardHeader>
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
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with your projects.</p>
      </div>

      {/* KPI Cards */}
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#7A1516] text-white rounded-lg flex items-center justify-center">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Projects</p>
                <p className="text-2xl font-bold">{projects.filter(p => p.status === 'active').length}</p>
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
                <p className="text-sm text-gray-500">Total Vendors</p>
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
                <p className="text-sm text-gray-500">Total Customers</p>
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
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectBudgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="budget" fill="#7A1516" name="Budget" />
                <Bar dataKey="spent" fill="#3b82f6" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue & Expenses Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue & Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.slice(0, 5).map((project) => {
              const customer = customers.find(c => c.id === project.customerId);
              const progress = project.budget && project.budget > 0 ? (project.spent / project.budget) * 100 : 0;
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
                    <p className="text-sm font-semibold">{formatCurrency(project.budget)}</p>
                    <p className="text-xs text-gray-500">{progress.toFixed(1)}% spent</p>
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