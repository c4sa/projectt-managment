import React, { useState, useEffect } from 'react';
import { dataStore } from '../../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Plus, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { Badge } from '../../ui/badge';

interface Props {
  projectId: string;
  prefilledData?: {
    customerId: string;
    invoiceId: string;
    amount: number;
  } | null;
  onDataUsed?: () => void;
}

export function CustomerPaymentTab({ projectId, prefilledData, onDataUsed }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    customerId: '',
    invoiceId: '',
    amount: 0,
    paymentMethod: 'bank_transfer' as 'bank_transfer' | 'cheque' | 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    if (prefilledData && dialogOpen) {
      setNewPayment({
        ...newPayment,
        customerId: prefilledData.customerId,
        invoiceId: prefilledData.invoiceId,
        amount: prefilledData.amount,
      });
      if (onDataUsed) {
        onDataUsed();
      }
    }
  }, [prefilledData, dialogOpen]);

  const loadData = async () => {
    const customersData = await dataStore.getCustomers();
    setCustomers(customersData);

    const invoicesData = await dataStore.getCustomerInvoices();
    const projectInvoices = invoicesData.filter((inv: any) => inv.projectId === projectId);
    setInvoices(projectInvoices);

    const paymentsData = await dataStore.getPayments(projectId);
    const customerPayments = paymentsData.filter((p: any) => p.type === 'receipt');
    setPayments(customerPayments);
  };

  const handleCreatePayment = async () => {
    const payment = {
      type: 'receipt' as const,
      customerId: newPayment.customerId,
      projectId,
      invoiceId: newPayment.invoiceId || undefined,
      amount: newPayment.amount,
      subtotal: newPayment.amount,
      paymentMethod: newPayment.paymentMethod,
      paymentDate: newPayment.paymentDate,
      referenceNumber: newPayment.referenceNumber,
      notes: newPayment.notes,
      status: 'paid' as const,
    };

    await dataStore.addPayment(payment);
    
    // Update invoice status if fully paid
    if (newPayment.invoiceId) {
      const invoice = invoices.find(inv => inv.id === newPayment.invoiceId);
      if (invoice) {
        const existingPayments = payments.filter(p => p.invoiceId === newPayment.invoiceId);
        const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + newPayment.amount;
        
        if (totalPaid >= invoice.total) {
          await dataStore.updateCustomerInvoice(newPayment.invoiceId, { status: 'paid' });
        }
      }
    }
    
    await loadData();
    setDialogOpen(false);
    setNewPayment({
      customerId: '',
      invoiceId: '',
      amount: 0,
      paymentMethod: 'bank_transfer',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      notes: '',
    });
  };

  const getAvailableInvoices = () => {
    if (!newPayment.customerId) return [];
    
    return invoices.filter(inv => {
      if (inv.customerId !== newPayment.customerId) return false;
      if (inv.status === 'draft') return false;
      
      // Calculate amount paid for this invoice
      const invoicePayments = payments.filter(p => p.invoiceId === inv.id && p.status === 'paid');
      const amountPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Only show invoices that are not fully paid
      return amountPaid < inv.total;
    });
  };

  const getInvoiceBalance = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return 0;
    
    const invoicePayments = payments.filter(p => p.invoiceId === invoiceId && p.status === 'paid');
    const amountPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0);
    
    return invoice.total - amountPaid;
  };

  const handleInvoiceChange = (invoiceId: string) => {
    // Handle "no-invoice" as empty string
    const actualInvoiceId = invoiceId === 'no-invoice' ? '' : invoiceId;
    setNewPayment({
      ...newPayment,
      invoiceId: actualInvoiceId,
      amount: actualInvoiceId ? getInvoiceBalance(actualInvoiceId) : 0,
    });
  };

  // Calculate summary metrics
  const totalReceived = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const thisMonthPayments = payments.filter(p => {
    const paymentDate = new Date(p.paymentDate);
    const now = new Date();
    return p.status === 'paid' && 
           paymentDate.getMonth() === now.getMonth() && 
           paymentDate.getFullYear() === now.getFullYear();
  });
  
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Received</div>
                <div className="text-2xl font-bold text-green-600">{totalReceived.toLocaleString()} SAR</div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">This Month</div>
                <div className="text-2xl font-bold text-blue-600">{thisMonthTotal.toLocaleString()} SAR</div>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Transactions</div>
                <div className="text-2xl font-bold">{payments.filter(p => p.status === 'paid').length}</div>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Customer Payments</h3>
          <p className="text-sm text-gray-500">Record payments received from customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record Customer Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select 
                    value={newPayment.customerId} 
                    onValueChange={(value) => setNewPayment({ ...newPayment, customerId: value, invoiceId: '', amount: 0 })}
                  >
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
                  <Label>Invoice (Optional)</Label>
                  <Select 
                    value={newPayment.invoiceId} 
                    onValueChange={handleInvoiceChange}
                    disabled={!newPayment.customerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice or leave blank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-invoice">No specific invoice</SelectItem>
                      {getAvailableInvoices().map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - Balance: {getInvoiceBalance(invoice.id).toLocaleString()} SAR
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount (SAR) *</Label>
                  <Input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                  {newPayment.invoiceId && (
                    <p className="text-xs text-gray-500">
                      Invoice Balance: {getInvoiceBalance(newPayment.invoiceId).toLocaleString()} SAR
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select 
                    value={newPayment.paymentMethod} 
                    onValueChange={(value: any) => setNewPayment({ ...newPayment, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    value={newPayment.referenceNumber}
                    onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                    placeholder="Transaction/Cheque number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  placeholder="Additional payment notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  className="bg-[#7A1516] hover:bg-[#5A1012]"
                  disabled={!newPayment.customerId || newPayment.amount <= 0}
                >
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Payment #</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Method</th>
                  <th className="text-left py-3 px-4">Reference</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const customer = customers.find(c => c.id === payment.customerId);
                  const invoice = invoices.find(inv => inv.id === payment.invoiceId);
                  
                  return (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{payment.paymentNumber}</td>
                      <td className="py-3 px-4">{customer?.name}</td>
                      <td className="py-3 px-4">{invoice?.invoiceNumber || '-'}</td>
                      <td className="py-3 px-4">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 capitalize">{payment.paymentMethod.replace('_', ' ')}</td>
                      <td className="py-3 px-4">{payment.referenceNumber || '-'}</td>
                      <td className="text-right py-3 px-4 font-semibold text-green-600">
                        {payment.amount.toLocaleString()} SAR
                      </td>
                      <td className="text-center py-3 px-4">
                        {payment.status === 'paid' ? (
                          <Badge className="bg-green-500">Paid</Badge>
                        ) : (
                          <Badge className="bg-yellow-500">{payment.status}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No payments recorded yet. Add your first payment!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}