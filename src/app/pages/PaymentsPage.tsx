import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { dataStore, Payment, PaymentStatus } from '../data/store';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, DollarSign, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  cash: 'Cash',
};

export function PaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [vendorsData, customersData, projectsData] = await Promise.all([
        dataStore.getVendors(),
        dataStore.getCustomers(),
        dataStore.getProjects(),
      ]);
      setVendors(vendorsData);
      setCustomers(customersData);
      setProjects(projectsData);
      // Get all payments across all projects
      const allPayments = await dataStore.getPayments();
      setPayments(allPayments);
      setLoading(false);
    };
    loadData();
  }, []);

  const formatCurrency = (amount: number) => `${amount.toLocaleString('en-SA')} SAR`;
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filterPayments = (type: 'payment' | 'receipt') =>
    payments.filter(p => {
      if (p.type !== type) return false;
      const party =
        type === 'payment'
          ? vendors.find(v => v.id === p.vendorId)
          : customers.find(c => c.id === p.customerId);
      const matchesSearch =
        (p.paymentNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (party?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesProject = projectFilter === 'all' || p.projectId === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });

  const filteredPayments = filterPayments('payment');
  const filteredReceipts = filterPayments('receipt');

  const totalPaid = filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.subtotal || p.amount), 0);
  const totalReceived = filteredReceipts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading payments...</p>
      </div>
    );
  }

  const PaymentTable = ({ rows, type }: { rows: Payment[]; type: 'payment' | 'receipt' }) => (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <DollarSign className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">No {type === 'payment' ? 'payments' : 'receipts'} found</p>
            <p className="text-sm mt-1">
              {type === 'payment'
                ? "Create vendor payments from within a project's Expenses tab"
                : "Create customer receipts from within a project's Income tab"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Payment #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    {type === 'payment' ? 'Vendor' : 'Customer'}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Reference</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const party =
                    type === 'payment'
                      ? vendors.find(v => v.id === p.vendorId)
                      : customers.find(c => c.id === p.customerId);
                  const project = projects.find(pr => pr.id === p.projectId);
                  const tabParam = type === 'payment' ? 'expenses' : 'income';
                  const amount = type === 'payment' ? (p.subtotal || p.amount) : p.amount;
                  return (
                    <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-[#7A1516]">{p.paymentNumber}</td>
                      <td className="px-4 py-3">{party?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{project?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(p.paymentDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.referenceNumber || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(amount)}</td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}>
                          {STATUS_LABELS[p.status] || p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {project && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/projects/${project.id}?tab=${tabParam}`)}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View in Project
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-gray-500 mt-1">Track payments and receipts across all projects</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredPayments.length}</div>
            <div className="text-sm text-gray-500">Vendor Payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredReceipts.length}</div>
            <div className="text-sm text-gray-500">Customer Receipts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalPaid)}</div>
            <div className="text-sm text-gray-500">Total Paid Out</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</div>
            <div className="text-sm text-gray-500">Total Received</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by payment number, reference or party name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | 'all')}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_LABELS) as PaymentStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Vendor Payments ({filteredPayments.length})</TabsTrigger>
          <TabsTrigger value="receipts">Customer Receipts ({filteredReceipts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="mt-4">
          <PaymentTable rows={filteredPayments} type="payment" />
        </TabsContent>
        <TabsContent value="receipts" className="mt-4">
          <PaymentTable rows={filteredReceipts} type="receipt" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
