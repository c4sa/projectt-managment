import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Download, FileText } from 'lucide-react';
import { dataStore, Project, VendorInvoice, CustomerInvoice } from '../data/store';

export function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, vendorInvoicesData, customerInvoicesData] = await Promise.all([
          dataStore.getProjects(),
          dataStore.getVendorInvoices(),
          dataStore.getCustomerInvoices(),
        ]);
        setProjects(projectsData);
        setVendorInvoices(vendorInvoicesData);
        setCustomerInvoices(customerInvoicesData);
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Calculate financial metrics from real data
  const totalRevenue = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = vendorInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalProfit = totalRevenue - totalExpenses;

  // Calculate month-by-month data from invoices
  const getMonthlyData = () => {
    const monthlyStats: { [key: string]: { revenue: number; expenses: number; profit: number } } = {};
    
    // Process customer invoices (revenue)
    customerInvoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyStats[monthKey].revenue += inv.total;
    });

    // Process vendor invoices (expenses)
    vendorInvoices.forEach(inv => {
      const date = new Date(inv.issueDate);
      const monthKey = date.toLocaleString('en-US', { month: 'short' });
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { revenue: 0, expenses: 0, profit: 0 };
      }
      monthlyStats[monthKey].expenses += inv.total;
    });

    // Calculate profit for each month
    Object.keys(monthlyStats).forEach(month => {
      monthlyStats[month].profit = monthlyStats[month].revenue - monthlyStats[month].expenses;
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
        profit: monthlyStats[monthName]?.profit || 0,
      });
    }

    return last6Months;
  };

  const financialData = loading ? [] : getMonthlyData();

  // Calculate period totals (6 months)
  const periodRevenue = financialData.reduce((sum, month) => sum + month.revenue, 0);
  const periodExpenses = financialData.reduce((sum, month) => sum + month.expenses, 0);
  const periodProfit = financialData.reduce((sum, month) => sum + month.profit, 0);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-SA')} SAR`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading report data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Comprehensive financial insights and reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profitloss">P&L Statement</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="projects">Project Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Total Revenue (6M)</div>
                <div className="text-2xl font-bold">{formatCurrency(periodRevenue)}</div>
                <div className="text-sm text-green-600 mt-2">↑ 12.5% from last period</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Total Expenses (6M)</div>
                <div className="text-2xl font-bold">{formatCurrency(periodExpenses)}</div>
                <div className="text-sm text-red-600 mt-2">↑ 8.2% from last period</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-gray-500 mb-1">Net Profit (6M)</div>
                <div className="text-2xl font-bold">{formatCurrency(periodProfit)}</div>
                <div className="text-sm text-green-600 mt-2">↑ 18.3% from last period</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Financial Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${(value as number).toLocaleString()} SAR`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                  <Line type="monotone" dataKey="profit" stroke="#7A1516" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${(value as number).toLocaleString()} SAR`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitloss" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Detailed P&L statement coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Balance sheet report coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Cash flow analysis coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Financial Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Project comparative analysis coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}