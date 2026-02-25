import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { dataStore, PurchaseOrder, POStatus } from '../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, FileText, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<POStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  issued: 'bg-blue-100 text-blue-700',
  received: 'bg-purple-100 text-purple-700',
  partially_paid: 'bg-orange-100 text-orange-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  issued: 'Issued',
  received: 'Received',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
};

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [posData, vendorsData, projectsData] = await Promise.all([
        dataStore.getPurchaseOrders(),
        dataStore.getVendors(),
        dataStore.getProjects(),
      ]);
      setPurchaseOrders(posData);
      setVendors(vendorsData);
      setProjects(projectsData);
      setLoading(false);
    };
    loadData();
  }, []);

  const filtered = purchaseOrders.filter(po => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesProject = projectFilter === 'all' || po.projectId === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString('en-SA')} SAR`;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-SA', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Summary stats
  const totalValue = filtered.reduce((sum, po) => sum + po.total, 0);
  const approvedCount = filtered.filter(po => po.status === 'approved' || po.status === 'issued' || po.status === 'received' || po.status === 'partially_paid' || po.status === 'paid').length;
  const pendingCount = filtered.filter(po => po.status === 'pending_approval').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading purchase orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <p className="text-gray-500 mt-1">Manage purchase orders and procurement across all projects</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filtered.length}</div>
            <div className="text-sm text-gray-500">Total POs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-gray-500">Pending Approval</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-sm text-gray-500">Approved / Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <div className="text-sm text-gray-500">Total Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by PO number or vendor..."
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
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as POStatus | 'all')}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_LABELS) as POStatus[]).map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mb-3" />
              <p className="text-lg font-medium">No purchase orders found</p>
              <p className="text-sm mt-1">Create purchase orders from within a project's Expenses tab</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">PO Number</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendor</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Project</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Issue Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((po) => {
                    const vendor = vendors.find(v => v.id === po.vendorId);
                    const project = projects.find(p => p.id === po.projectId);
                    return (
                      <tr key={po.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-[#7A1516]">{po.poNumber}</td>
                        <td className="px-4 py-3">{vendor?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{project?.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(po.issueDate)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(po.total)}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[po.status]}>
                            {STATUS_LABELS[po.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {project && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/projects/${project.id}?tab=expenses`)}
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
    </div>
  );
}
