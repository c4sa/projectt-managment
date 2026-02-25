import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { dataStore, VendorInvoice, CustomerInvoice, InvoiceStatus } from '../data/store';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Search, FileText, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-blue-100 text-blue-700',
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  sent: 'Sent',
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [viData, ciData, vendorsData, customersData, projectsData] = await Promise.all([
        dataStore.getVendorInvoices(),
        dataStore.getCustomerInvoices(),
        dataStore.getVendors(),
        dataStore.getCustomers(),
        dataStore.getProjects(),
      ]);
      setVendorInvoices(viData);
      setCustomerInvoices(ciData);
      setVendors(vendorsData);
      setCustomers(customersData);
      setProjects(projectsData);
      setLoading(false);
    };
    loadData();
  }, []);

  const formatCurrency = (amount: number) => `${amount.toLocaleString('en-SA')} SAR`;
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filterVendorInvoices = () =>
    vendorInvoices.filter(inv => {
      const vendor = vendors.find(v => v.id === inv.vendorId);
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesProject = projectFilter === 'all' || inv.projectId === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });

  const filterCustomerInvoices = () =>
    customerInvoices.filter(inv => {
      const customer = customers.find(c => c.id === inv.customerId);
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesProject = projectFilter === 'all' || inv.projectId === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });

  const filteredVendor = filterVendorInvoices();
  const filteredCustomer = filterCustomerInvoices();

  const totalVendorValue = filteredVendor.reduce((sum, inv) => sum + inv.total, 0);
  const totalCustomerValue = filteredCustomer.reduce((sum, inv) => sum + inv.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading invoices...</p>
      </div>
    );
  }

  const InvoiceTable = ({ rows, type }: { rows: any[]; type: 'vendor' | 'customer' }) => (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">No invoices found</p>
            <p className="text-sm mt-1">
              {type === 'vendor'
                ? "Create vendor invoices from within a project's Expenses tab"
                : "Create customer invoices from within a project's Income tab"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Invoice #</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    {type === 'vendor' ? 'Vendor' : 'Customer'}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Issue Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const party =
                    type === 'vendor'
                      ? vendors.find(v => v.id === inv.vendorId)
                      : customers.find(c => c.id === inv.customerId);
                  const project = projects.find(p => p.id === inv.projectId);
                  const tabParam = type === 'vendor' ? 'expenses' : 'income';
                  return (
                    <tr key={inv.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-[#7A1516]">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">{party?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{project?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.issueDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[inv.status as InvoiceStatus] || 'bg-gray-100 text-gray-700'}>
                          {STATUS_LABELS[inv.status as InvoiceStatus] || inv.status}
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
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-gray-500 mt-1">Manage vendor and customer invoices across all projects</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredVendor.length}</div>
            <div className="text-sm text-gray-500">Vendor Invoices</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredCustomer.length}</div>
            <div className="text-sm text-gray-500">Customer Invoices</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalVendorValue)}</div>
            <div className="text-sm text-gray-500">Total Vendor (Payable)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCustomerValue)}</div>
            <div className="text-sm text-gray-500">Total Customer (Receivable)</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by invoice number or party name..."
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
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="vendor">
        <TabsList>
          <TabsTrigger value="vendor">Vendor Invoices ({filteredVendor.length})</TabsTrigger>
          <TabsTrigger value="customer">Customer Invoices ({filteredCustomer.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="vendor" className="mt-4">
          <InvoiceTable rows={filteredVendor} type="vendor" />
        </TabsContent>
        <TabsContent value="customer" className="mt-4">
          <InvoiceTable rows={filteredCustomer} type="customer" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
