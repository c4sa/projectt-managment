import React, { useState, useEffect } from 'react';
import { dataStore, CustomerInvoice } from '../../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Plus, FileText, DollarSign, Calendar, CheckCircle, XCircle, Clock, Pencil, Trash2, Check } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { usePermissionsMatrix } from '../../../contexts/PermissionsMatrixContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  onRequestPayment?: (paymentData: { customerId: string; invoiceId: string; amount: number }) => void;
}

export function CustomerInvoiceTab({ projectId, onRequestPayment }: Props) {
  const { hasPermission } = usePermissionsMatrix();
  const canCreateInvoice = hasPermission('customer_invoices', 'create');
  const canIssueInvoice = hasPermission('customer_invoices', 'issue');
  const canApproveInvoice = hasPermission('customer_invoices', 'approve');
  const canEditInvoice = hasPermission('customer_invoices', 'edit');
  const canDeleteInvoice = hasPermission('customer_invoices', 'delete');
  const canCreatePayment = hasPermission('payments', 'create');
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState<{
    customerId: string;
    issueDate: string;
    dueDate: string;
    items: { description: string; quantity: number; unitPrice: number; total: number; unit: string }[];
    vatRate: number;
    notes: string;
  } | null>(null);
  const [deleteConfirmInvoice, setDeleteConfirmInvoice] = useState<{ id: string; invoiceNumber: string } | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0, unit: 'pcs' }],
    vatRate: 15,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    const customersData = await dataStore.getCustomers();
    setCustomers(customersData);

    const invoicesData = await dataStore.getCustomerInvoices();
    const projectInvoices = invoicesData.filter((inv: any) => inv.projectId === projectId);
    
    // Get payments to calculate amounts paid
    const paymentsData = await dataStore.getPayments(projectId);
    setPayments(paymentsData);

    // Update invoice statuses based on payments
    const updatedInvoices = projectInvoices.map((invoice: CustomerInvoice) => {
      const invoicePayments = paymentsData.filter((p: any) => p.type === 'receipt' && p.invoiceId === invoice.id && (p.status === 'approved' || p.status === 'paid'));
      const amountPaid = invoicePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      let status = invoice.status;
      if (amountPaid >= invoice.total) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'pending'; // Using 'pending' for partially paid
      }
      
      return { ...invoice, amountPaid, status };
    });
    
    setInvoices(updatedInvoices);
  };

  const handleAddItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: 0, total: 0, unit: 'pcs' }],
    });
  };

  const handleRemoveItem = (index: number) => {
    const items = newInvoice.items.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, items });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const items = [...newInvoice.items];
    items[index] = { ...items[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].total = items[index].quantity * items[index].unitPrice;
    }
    
    setNewInvoice({ ...newInvoice, items });
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateVAT = () => {
    return (calculateSubtotal() * newInvoice.vatRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const handleCreateInvoice = async () => {
    const invoice = {
      customerId: newInvoice.customerId,
      projectId,
      issueDate: newInvoice.issueDate,
      dueDate: newInvoice.dueDate,
      items: newInvoice.items,
      subtotal: calculateSubtotal(),
      vatRate: newInvoice.vatRate,
      vatAmount: calculateVAT(),
      total: calculateTotal(),
      notes: newInvoice.notes,
      status: 'draft' as const,
    };

    await dataStore.addCustomerInvoice(invoice);
    await loadData();
    setDialogOpen(false);
    setNewInvoice({
      customerId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: [{ description: '', quantity: 1, unitPrice: 0, total: 0, unit: 'pcs' }],
      vatRate: 15,
      notes: '',
    });
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: 'draft' | 'sent' | 'approved' | 'paid') => {
    await dataStore.updateCustomerInvoice(invoiceId, { status: newStatus });
    await loadData();
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await dataStore.deleteCustomerInvoice(invoiceId);
      toast.success('Invoice deleted');
      setDeleteConfirmInvoice(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice');
    }
  };

  const openEditInvoice = (invoice: CustomerInvoice) => {
    const items = Array.isArray(invoice.items)
      ? invoice.items.map((it: any) => ({
          description: it.description || '',
          quantity: it.quantity ?? 1,
          unitPrice: it.unitPrice ?? 0,
          total: (it.quantity ?? 1) * (it.unitPrice ?? 0),
          unit: it.unit || 'pcs',
        }))
      : [{ description: '', quantity: 1, unitPrice: 0, total: 0, unit: 'pcs' }];
    setEditInvoice({
      customerId: invoice.customerId || '',
      issueDate: (invoice.issueDate || '').toString().split('T')[0],
      dueDate: (invoice.dueDate || '').toString().split('T')[0],
      items,
      vatRate: invoice.vatRate ?? 15,
      notes: invoice.notes || '',
    });
    setEditInvoiceId(invoice.id);
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    if (!editInvoice) return;
    const items = [...editInvoice.items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].total = items[index].quantity * items[index].unitPrice;
    }
    setEditInvoice({ ...editInvoice, items });
  };

  const handleSaveEditInvoice = async () => {
    if (!editInvoiceId || !editInvoice) return;
    const subtotal = editInvoice.items.reduce((s, i) => s + i.total, 0);
    const vatAmount = (subtotal * editInvoice.vatRate) / 100;
    await dataStore.updateCustomerInvoice(editInvoiceId, {
      customerId: editInvoice.customerId,
      issueDate: editInvoice.issueDate,
      dueDate: editInvoice.dueDate,
      items: editInvoice.items,
      subtotal,
      vatRate: editInvoice.vatRate,
      vatAmount,
      total: subtotal + vatAmount,
      notes: editInvoice.notes,
    });
    toast.success('Invoice updated');
    setEditInvoiceId(null);
    setEditInvoice(null);
    await loadData();
  };

  const canDelete = (invoice: any) => {
    const amountPaid = invoice.amountPaid || 0;
    return invoice.status === 'draft' || (amountPaid === 0 && (invoice.status === 'sent' || invoice.status === 'approved'));
  };

  const getStatusBadge = (invoice: any) => {
    const amountPaid = invoice.amountPaid || 0;
    const total = invoice.total || 0;
    
    if (amountPaid >= total) {
      return <Badge className="bg-green-500">Paid</Badge>;
    } else if (amountPaid > 0) {
      return <Badge className="bg-yellow-500">Partially Paid</Badge>;
    } else if (invoice.status === 'sent' || invoice.status === 'approved') {
      return <Badge className="bg-blue-500">Sent</Badge>;
    } else if (invoice.status === 'draft') {
      return <Badge className="bg-gray-500">Draft</Badge>;
    }
    return <Badge>{invoice.status}</Badge>;
  };

  const handleRequestPayment = (invoice: any) => {
    const amountPaid = invoice.amountPaid || 0;
    const remainingAmount = invoice.total - amountPaid;
    
    if (onRequestPayment && remainingAmount > 0) {
      onRequestPayment({
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        amount: remainingAmount,
      });
    }
  };

  // Calculate summary metrics - approved/sent/paid invoices per Document (TotalInvoiced = Sum where status = Approved)
  const totalInvoiced = invoices
    .filter(inv => inv.status === 'approved' || inv.status === 'sent' || inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  
  const totalOutstanding = totalInvoiced - totalPaid;
  
  const draftCount = invoices.filter(inv => inv.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Invoiced</div>
                <div className="text-2xl font-bold">{totalInvoiced.toLocaleString()} SAR</div>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Collected</div>
                <div className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} SAR</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Outstanding</div>
                <div className="text-2xl font-bold text-orange-600">{totalOutstanding.toLocaleString()} SAR</div>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Collection Rate</div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : '0'}%
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Customer Invoices</h3>
          <p className="text-sm text-gray-500">Manage progress billing and customer invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          {canCreateInvoice && (
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          )}
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Customer Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={newInvoice.customerId} onValueChange={(value) => setNewInvoice({ ...newInvoice, customerId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>VAT Rate (%)</Label>
                  <Input
                    type="number"
                    value={newInvoice.vatRate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, vatRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Issue Date *</Label>
                  <Input
                    type="date"
                    value={newInvoice.issueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, issueDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <div className="border rounded-lg p-4 space-y-3">
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          placeholder="pcs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Total</Label>
                        <Input value={item.total.toFixed(2)} disabled />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          disabled={newInvoice.items.length === 1}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{calculateSubtotal().toLocaleString()} SAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT ({newInvoice.vatRate}%):</span>
                    <span className="font-semibold">{calculateVAT().toLocaleString()} SAR</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold">{calculateTotal().toLocaleString()} SAR</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Additional notes or payment terms..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                {canCreateInvoice && (
                <Button
                  onClick={handleCreateInvoice}
                  className="bg-[#7A1516] hover:bg-[#5A1012]"
                  disabled={!newInvoice.customerId || !newInvoice.dueDate || newInvoice.items.length === 0}
                >
                  Create Invoice
                </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Issue Date</th>
                  <th className="text-left py-3 px-4">Due Date</th>
                  <th className="text-right py-3 px-4">Total Amount</th>
                  <th className="text-right py-3 px-4">Amount Paid</th>
                  <th className="text-right py-3 px-4">Outstanding</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const customer = customers.find(c => c.id === invoice.customerId);
                  const amountPaid = invoice.amountPaid || 0;
                  const outstanding = invoice.total - amountPaid;
                  
                  return (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{invoice.invoiceNumber}</td>
                      <td className="py-3 px-4">{customer?.name}</td>
                      <td className="py-3 px-4">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                      <td className="text-right py-3 px-4">{invoice.total.toLocaleString()} SAR</td>
                      <td className="text-right py-3 px-4 text-green-600 font-semibold">
                        {amountPaid.toLocaleString()} SAR
                      </td>
                      <td className="text-right py-3 px-4 text-orange-600 font-semibold">
                        {outstanding.toLocaleString()} SAR
                      </td>
                      <td className="text-center py-3 px-4">{getStatusBadge(invoice)}</td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {canApproveInvoice && invoice.status === 'sent' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(invoice.id, 'approved')}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {canIssueInvoice && invoice.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(invoice.id, 'sent')}
                              className="bg-blue-500 hover:bg-blue-600"
                            >
                              Send
                            </Button>
                          )}
                          {canEditInvoice && invoice.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditInvoice(invoice)}
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          )}
                          {canDeleteInvoice && canDelete(invoice) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => setDeleteConfirmInvoice({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          )}
                          {canCreatePayment && outstanding > 0 && invoice.status !== 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleRequestPayment(invoice)}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              Record Payment
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      No invoices yet. Create your first customer invoice!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Invoice Dialog */}
      <Dialog open={!!editInvoiceId} onOpenChange={(open) => !open && (setEditInvoiceId(null), setEditInvoice(null))}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
          </DialogHeader>
          {editInvoice && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={editInvoice.customerId} onValueChange={(v) => setEditInvoice({ ...editInvoice, customerId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>VAT Rate (%)</Label>
                  <Input
                    type="number"
                    value={editInvoice.vatRate}
                    onChange={(e) => setEditInvoice({ ...editInvoice, vatRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issue Date *</Label>
                  <Input
                    type="date"
                    value={editInvoice.issueDate}
                    onChange={(e) => setEditInvoice({ ...editInvoice, issueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input
                    type="date"
                    value={editInvoice.dueDate}
                    onChange={(e) => setEditInvoice({ ...editInvoice, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Line Items</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  {editInvoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Input
                          value={item.description}
                          onChange={(e) => handleEditItemChange(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          value={item.unit}
                          onChange={(e) => handleEditItemChange(index, 'unit', e.target.value)}
                          placeholder="pcs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleEditItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleEditItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input value={item.total.toFixed(2)} disabled />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setEditInvoice({ ...editInvoice, items: editInvoice.items.filter((_, i) => i !== index) })}
                          disabled={editInvoice.items.length === 1}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditInvoice({ ...editInvoice, items: [...editInvoice.items, { description: '', quantity: 1, unitPrice: 0, total: 0, unit: 'pcs' }] })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editInvoice.notes}
                  onChange={(e) => setEditInvoice({ ...editInvoice, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => (setEditInvoiceId(null), setEditInvoice(null))}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditInvoice} className="bg-[#7A1516] hover:bg-[#5A1012]" disabled={!editInvoice.customerId || !editInvoice.dueDate || editInvoice.items.length === 0}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmInvoice} onOpenChange={(open) => !open && setDeleteConfirmInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {deleteConfirmInvoice?.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                deleteConfirmInvoice && handleDeleteInvoice(deleteConfirmInvoice.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}