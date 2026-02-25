import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { Download, FileText } from 'lucide-react';
import { dataStore, Project, VendorInvoice, CustomerInvoice, Payment } from '../data/store';

export function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [budgetItemsByProject, setBudgetItemsByProject] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsData, vendorInvoicesData, customerInvoicesData, paymentsData] = await Promise.all([
          dataStore.getProjects(),
          dataStore.getVendorInvoices(),
          dataStore.getCustomerInvoices(),
          dataStore.getPayments(),
        ]);
        setProjects(projectsData);
        setVendorInvoices(vendorInvoicesData);
        setCustomerInvoices(customerInvoicesData);
        setPayments(paymentsData);

        // Load budget items for all projects
        const budgetEntries = await Promise.all(
          projectsData.map(async p => [p.id, await dataStore.getBudgetItems(p.id)] as [string, any[]])
        );
        setBudgetItemsByProject(Object.fromEntries(budgetEntries));
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
          {(() => {
            const totalRevenue = customerInvoices.reduce((s, i) => s + i.total, 0);
            const vatOnRevenue = customerInvoices.reduce((s, i) => s + i.vatAmount, 0);
            const revenueExVat = totalRevenue - vatOnRevenue;
            const totalCogs = vendorInvoices.reduce((s, i) => s + i.subtotal, 0);
            const vatOnCogs = vendorInvoices.reduce((s, i) => s + (i.vatAmount || 0), 0);
            const grossProfit = revenueExVat - totalCogs;
            const grossMargin = revenueExVat > 0 ? ((grossProfit / revenueExVat) * 100).toFixed(1) : '0.0';
            const paidOut = payments.filter(p => p.type === 'payment' && p.status === 'paid').reduce((s, p) => s + (p.subtotal || p.amount), 0);
            const received = payments.filter(p => p.type === 'receipt' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
            const netProfit = revenueExVat - totalCogs;
            const rows = [
              { label: 'Revenue', isHeader: true },
              { label: 'Customer Invoices (Excl. VAT)', value: revenueExVat, positive: true },
              { label: 'VAT on Revenue', value: vatOnRevenue, positive: true, sub: true },
              { label: 'Total Revenue (Incl. VAT)', value: totalRevenue, positive: true, bold: true },
              { label: 'Cost of Sales', isHeader: true },
              { label: 'Vendor Invoices (Excl. VAT)', value: totalCogs, positive: false },
              { label: 'VAT on Purchases', value: vatOnCogs, positive: false, sub: true },
              { label: 'Total Costs (Incl. VAT)', value: totalCogs + vatOnCogs, positive: false, bold: true },
              { label: 'Gross Profit', isHeader: true },
              { label: `Gross Profit (Margin: ${grossMargin}%)`, value: grossProfit, positive: grossProfit >= 0, bold: true },
              { label: 'Cash Position', isHeader: true },
              { label: 'Total Paid Out', value: paidOut, positive: false },
              { label: 'Total Received', value: received, positive: true },
              { label: 'Net Cash Position', value: received - paidOut, positive: (received - paidOut) >= 0, bold: true },
            ];
            return (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Profit & Loss Statement</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-semibold text-gray-600">Item</th>
                          <th className="text-right py-2 font-semibold text-gray-600">Amount (SAR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          row.isHeader ? (
                            <tr key={i} className="bg-gray-50">
                              <td colSpan={2} className="py-2 px-2 font-semibold text-gray-700 uppercase text-xs tracking-wider">{row.label}</td>
                            </tr>
                          ) : (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className={`py-2 ${row.sub ? 'pl-6 text-gray-500' : ''} ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
                              <td className={`py-2 text-right font-mono ${row.bold ? 'font-semibold' : ''} ${row.positive ? 'text-green-700' : 'text-red-700'}`}>
                                {row.positive ? '+' : '-'}{Math.abs(row.value as number).toLocaleString('en-SA')} SAR
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="balance" className="mt-6">
          {(() => {
            const totalReceivable = customerInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
            const totalPayable = vendorInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
            const cashReceived = payments.filter(p => p.type === 'receipt' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
            const cashPaidOut = payments.filter(p => p.type === 'payment' && p.status === 'paid').reduce((s, p) => s + (p.subtotal || p.amount), 0);
            const netCash = cashReceived - cashPaidOut;
            const totalAssets = totalReceivable + Math.max(0, netCash);
            const totalLiabilities = totalPayable;
            const equity = totalAssets - totalLiabilities;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-green-700">Assets</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="bg-gray-50">
                          <td colSpan={2} className="py-2 px-2 font-semibold text-xs uppercase tracking-wider text-gray-600">Current Assets</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Cash & Received Payments</td>
                          <td className="py-2 text-right font-mono text-green-700">{Math.max(0, netCash).toLocaleString('en-SA')} SAR</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Accounts Receivable (Unpaid Customer Invoices)</td>
                          <td className="py-2 text-right font-mono text-green-700">{totalReceivable.toLocaleString('en-SA')} SAR</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="py-2">Total Assets</td>
                          <td className="py-2 text-right font-mono text-green-700">{totalAssets.toLocaleString('en-SA')} SAR</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-red-700">Liabilities & Equity</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="bg-gray-50">
                          <td colSpan={2} className="py-2 px-2 font-semibold text-xs uppercase tracking-wider text-gray-600">Current Liabilities</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Accounts Payable (Unpaid Vendor Invoices)</td>
                          <td className="py-2 text-right font-mono text-red-700">{totalPayable.toLocaleString('en-SA')} SAR</td>
                        </tr>
                        <tr className="bg-red-50 font-semibold border-b">
                          <td className="py-2">Total Liabilities</td>
                          <td className="py-2 text-right font-mono text-red-700">{totalLiabilities.toLocaleString('en-SA')} SAR</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td colSpan={2} className="py-2 px-2 font-semibold text-xs uppercase tracking-wider text-gray-600">Equity</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Retained Earnings / Net Position</td>
                          <td className={`py-2 text-right font-mono font-semibold ${equity >= 0 ? 'text-green-700' : 'text-red-700'}`}>{equity.toLocaleString('en-SA')} SAR</td>
                        </tr>
                        <tr className="bg-blue-50 font-semibold">
                          <td className="py-2">Total Liabilities + Equity</td>
                          <td className="py-2 text-right font-mono">{(totalLiabilities + Math.max(0, equity)).toLocaleString('en-SA')} SAR</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
          {(() => {
            const inflows = payments.filter(p => p.type === 'receipt' && p.status === 'paid');
            const outflows = payments.filter(p => p.type === 'payment' && p.status === 'paid');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonth = new Date().getMonth();
            const cashData = [];
            let runningBalance = 0;
            for (let i = 5; i >= 0; i--) {
              const mIdx = (currentMonth - i + 12) % 12;
              const mName = months[mIdx];
              const mInflow = inflows.filter(p => new Date(p.paymentDate).toLocaleString('en-US', { month: 'short' }) === mName).reduce((s, p) => s + p.amount, 0);
              const mOutflow = outflows.filter(p => new Date(p.paymentDate).toLocaleString('en-US', { month: 'short' }) === mName).reduce((s, p) => s + (p.subtotal || p.amount), 0);
              runningBalance += mInflow - mOutflow;
              cashData.push({ month: mName, inflow: mInflow, outflow: mOutflow, net: mInflow - mOutflow, balance: runningBalance });
            }
            const totalInflow = inflows.reduce((s, p) => s + p.amount, 0);
            const totalOutflow = outflows.reduce((s, p) => s + (p.subtotal || p.amount), 0);
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Total Cash In</div><div className="text-2xl font-bold text-green-700">{totalInflow.toLocaleString('en-SA')} SAR</div></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Total Cash Out</div><div className="text-2xl font-bold text-red-700">{totalOutflow.toLocaleString('en-SA')} SAR</div></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Net Cash Position</div><div className={`text-2xl font-bold ${(totalInflow - totalOutflow) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{(totalInflow - totalOutflow).toLocaleString('en-SA')} SAR</div></CardContent></Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>Monthly Cash Flow (Last 6 Months)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={cashData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(v) => `${(v as number).toLocaleString()} SAR`} />
                        <Legend />
                        <Bar dataKey="inflow" fill="#10b981" name="Cash In" />
                        <Bar dataKey="outflow" fill="#ef4444" name="Cash Out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Cash Flow Statement</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-2 font-semibold text-gray-600">Month</th>
                          <th className="text-right py-2 px-2 font-semibold text-green-700">Cash In</th>
                          <th className="text-right py-2 px-2 font-semibold text-red-700">Cash Out</th>
                          <th className="text-right py-2 px-2 font-semibold text-gray-700">Net</th>
                          <th className="text-right py-2 px-2 font-semibold text-gray-700">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashData.map(row => (
                          <tr key={row.month} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2 font-medium">{row.month}</td>
                            <td className="py-2 px-2 text-right text-green-700 font-mono">{row.inflow.toLocaleString('en-SA')}</td>
                            <td className="py-2 px-2 text-right text-red-700 font-mono">{row.outflow.toLocaleString('en-SA')}</td>
                            <td className={`py-2 px-2 text-right font-mono font-semibold ${row.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{row.net.toLocaleString('en-SA')}</td>
                            <td className={`py-2 px-2 text-right font-mono ${row.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{row.balance.toLocaleString('en-SA')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          {(() => {
            const projectData = projects.map(project => {
              const budgetItems = budgetItemsByProject[project.id] ?? [];
              const totalBudget = budgetItems.reduce((s: number, b: any) => s + b.budgeted, 0) || project.budget || 0;
              const projectVendorInvoices = vendorInvoices.filter(i => i.projectId === project.id);
              const projectCustomerInvoices = customerInvoices.filter(i => i.projectId === project.id);
              const projectPayments = payments.filter(p => p.projectId === project.id);
              const totalExpenses = projectVendorInvoices.reduce((s, i) => s + i.total, 0);
              const totalRevenue = projectCustomerInvoices.reduce((s, i) => s + i.total, 0);
              const totalPaid = projectPayments.filter(p => p.type === 'payment' && p.status === 'paid').reduce((s, p) => s + (p.subtotal || p.amount), 0);
              const totalReceived = projectPayments.filter(p => p.type === 'receipt' && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
              const profit = totalRevenue - totalExpenses;
              const budgetUsed = totalBudget > 0 ? ((totalExpenses / totalBudget) * 100).toFixed(1) : '0.0';
              return { ...project, totalBudget, totalExpenses, totalRevenue, totalPaid, totalReceived, profit, budgetUsed };
            });
            const chartData = projectData.map(p => ({ name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name, budget: p.totalBudget, expenses: p.totalExpenses, revenue: p.totalRevenue }));
            const PIE_COLORS = ['#7A1516', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
            const pieData = projectData.filter(p => p.totalRevenue > 0).map(p => ({ name: p.name, value: p.totalRevenue }));
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle>Budget vs Expenses by Project</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip formatter={(v) => `${(v as number).toLocaleString()} SAR`} />
                          <Legend />
                          <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                          <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  {pieData.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle>Revenue by Project</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name.slice(0, 10)}: ${(percent * 100).toFixed(0)}%`}>
                              {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v) => `${(v as number).toLocaleString()} SAR`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <Card>
                  <CardHeader><CardTitle>Project Financial Comparison</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Project</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Budget</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Expenses</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Revenue</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Profit</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Budget Used</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Paid Out</th>
                            <th className="text-right px-4 py-3 font-semibold text-gray-600">Received</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectData.map(p => (
                            <tr key={p.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{p.name}</td>
                              <td className="px-4 py-3 text-right font-mono">{p.totalBudget.toLocaleString('en-SA')}</td>
                              <td className="px-4 py-3 text-right font-mono text-red-700">{p.totalExpenses.toLocaleString('en-SA')}</td>
                              <td className="px-4 py-3 text-right font-mono text-green-700">{p.totalRevenue.toLocaleString('en-SA')}</td>
                              <td className={`px-4 py-3 text-right font-mono font-semibold ${p.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{p.profit.toLocaleString('en-SA')}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-semibold ${parseFloat(p.budgetUsed) > 100 ? 'text-red-700' : parseFloat(p.budgetUsed) > 80 ? 'text-yellow-600' : 'text-green-700'}`}>{p.budgetUsed}%</span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-red-700">{p.totalPaid.toLocaleString('en-SA')}</td>
                              <td className="px-4 py-3 text-right font-mono text-green-700">{p.totalReceived.toLocaleString('en-SA')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}