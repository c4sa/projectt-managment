import React, { useState, useEffect } from 'react';
import { dataStore } from '../../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Plus, Eye, FileText, Calendar, DollarSign, TrendingUp, TrendingDown, Info, CheckCircle, XCircle, Clock, Edit, Printer, Pencil, Trash2 } from 'lucide-react';
import { VendorSelector } from '../../VendorSelector';

interface LineItemPayment {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  paymentType: 'full' | 'fixed' | 'percentage';
  paymentValue: number; // amount for 'fixed', percentage for 'percentage'
  previouslyPaid: number;
  remaining: number;
  paymentAmount: number;
}

interface Props {
  projectId: string;
  prefilledData?: {
    vendorId: string;
    poId?: string;
    invoiceId?: string;
    amount?: number;
  } | null;
  onDataUsed: () => void;
}

// Mock current user - in production, this would come from auth context
const currentUser = {
  id: '1',
  name: 'Admin User',
  role: 'admin' as const, // Change to 'user' to test regular user permissions
};

export function VendorPaymentTab({ projectId, prefilledData, onDataUsed }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [modificationRequestDialogOpen, setModificationRequestDialogOpen] = useState(false);
  const [modificationRequestReason, setModificationRequestReason] = useState('');
  const [isFromPO, setIsFromPO] = useState(false);
  const [isFromInvoice, setIsFromInvoice] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [lineItemPayments, setLineItemPayments] = useState<LineItemPayment[]>([]);
  const [paymentNumber, setPaymentNumber] = useState('');
  const [newPayment, setNewPayment] = useState({
    vendorId: '',
    poId: '',
    invoiceId: '',
    amount: 0,
    paymentMethod: 'bank_transfer' as const,
    referenceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Handle pre-filled data from PO or Invoice request payment
  useEffect(() => {
    if (prefilledData) {
      if (prefilledData.poId) {
        loadPODetails(prefilledData.poId);
        setIsFromPO(true);
        setIsFromInvoice(false);
        setNewPayment({
          vendorId: prefilledData.vendorId,
          poId: prefilledData.poId,
          invoiceId: '',
          amount: 0,
          paymentMethod: 'bank_transfer',
          referenceNumber: '',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
      } else if (prefilledData.invoiceId) {
        loadInvoiceDetails(prefilledData.invoiceId);
        setIsFromInvoice(true);
        setIsFromPO(false);
        setNewPayment({
          vendorId: prefilledData.vendorId,
          poId: '',
          invoiceId: prefilledData.invoiceId,
          amount: prefilledData.amount || 0,
          paymentMethod: 'bank_transfer',
          referenceNumber: '',
          paymentDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
      }
      generatePaymentNumber();
      setDialogOpen(true);
    }
  }, [prefilledData]);

  const generatePaymentNumber = async () => {
    const number = await dataStore.generatePaymentNumber();
    setPaymentNumber(number);
  };

  const loadPODetails = async (poId: string) => {
    const pos = await dataStore.getPurchaseOrders(projectId);
    const po = pos.find((p: any) => p.id === poId);
    if (po) {
      setSelectedPO(po);
      
      // Get all payments for this PO to calculate previously paid amounts per line item
      const allPayments = await dataStore.getPayments(projectId);
      const poPayments = allPayments.filter((p: any) => p.poId === poId && p.type === 'payment');
      
      // Initialize line item payments
      const lineItems: LineItemPayment[] = po.items.map((item: any, index: number) => {
        // Calculate previously paid for this line item
        const itemPreviouslyPaid = poPayments.reduce((sum: number, payment: any) => {
          if (payment.lineItemPayments && payment.lineItemPayments[index]) {
            return sum + payment.lineItemPayments[index].paymentAmount;
          }
          return sum;
        }, 0);

        const lineTotal = item.quantity * item.unitPrice;
        const remaining = lineTotal - itemPreviouslyPaid;

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal,
          paymentType: 'full',
          paymentValue: 100,
          previouslyPaid: itemPreviouslyPaid,
          remaining,
          paymentAmount: remaining,
        };
      });
      
      setLineItemPayments(lineItems);
    }
  };

  const loadInvoiceDetails = async (invoiceId: string) => {
    const invoicesData = await dataStore.getVendorInvoices();
    const invoice = invoicesData.find((inv: any) => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      
      // Get all payments for this invoice to calculate previously paid amounts per line item
      const allPayments = await dataStore.getPayments(projectId);
      const invoicePayments = allPayments.filter((p: any) => p.invoiceId === invoiceId && p.type === 'payment');
      
      // Initialize line item payments
      const lineItems: LineItemPayment[] = invoice.items.map((item: any, index: number) => {
        // Calculate previously paid for this line item
        const itemPreviouslyPaid = invoicePayments.reduce((sum: number, payment: any) => {
          if (payment.lineItemPayments && payment.lineItemPayments[index]) {
            return sum + payment.lineItemPayments[index].paymentAmount;
          }
          return sum;
        }, 0);

        const lineTotal = item.quantity * item.unitPrice;
        const remaining = lineTotal - itemPreviouslyPaid;

        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal,
          paymentType: 'full',
          paymentValue: 100,
          previouslyPaid: itemPreviouslyPaid,
          remaining,
          paymentAmount: remaining,
        };
      });
      
      setLineItemPayments(lineItems);
    }
  };

  const loadData = async () => {
    const paymentsData = await dataStore.getPayments(projectId);
    const vendorPayments = paymentsData.filter((p: any) => p.type === 'payment');
    setPayments(vendorPayments);
    
    const vendorsData = await dataStore.getVendors();
    setVendors(vendorsData);

    const pos = await dataStore.getPurchaseOrders(projectId);
    setPurchaseOrders(pos);

    const invoicesData = await dataStore.getVendorInvoices();
    const projectInvoices = invoicesData.filter((inv: any) => inv.projectId === projectId);
    setInvoices(projectInvoices);
  };

  const handleLineItemPaymentChange = (index: number, field: string, value: any) => {
    const updatedItems = [...lineItemPayments];
    const item = updatedItems[index];
    
    if (field === 'paymentType') {
      item.paymentType = value;
      if (value === 'full') {
        item.paymentValue = 100;
        item.paymentAmount = item.remaining;
      } else if (value === 'fixed') {
        item.paymentValue = 0;
        item.paymentAmount = 0;
      } else if (value === 'percentage') {
        item.paymentValue = 0;
        item.paymentAmount = 0;
      }
    } else if (field === 'paymentValue') {
      const inputValue = parseFloat(value) || 0;
      
      if (item.paymentType === 'fixed') {
        // Limit fixed amount to remaining balance
        const cappedAmount = Math.min(inputValue, item.remaining);
        item.paymentValue = cappedAmount;
        item.paymentAmount = cappedAmount;
      } else if (item.paymentType === 'percentage') {
        // Calculate remaining percentage (what % of line total is still unpaid)
        const remainingPercentage = (item.remaining / item.lineTotal) * 100;
        
        // Cap percentage at both 100% and remaining percentage
        const cappedPercentage = Math.min(Math.max(inputValue, 0), 100, remainingPercentage);
        item.paymentValue = cappedPercentage;
        
        // Calculate payment amount based on capped percentage
        item.paymentAmount = (item.lineTotal * cappedPercentage) / 100;
        
        // Double-check it doesn't exceed remaining (due to rounding)
        item.paymentAmount = Math.min(item.paymentAmount, item.remaining);
      }
    }
    
    setLineItemPayments(updatedItems);
  };

  const calculateTotalPayment = () => {
    return lineItemPayments.reduce((sum, item) => sum + item.paymentAmount, 0);
  };

  const calculateTotalPreviouslyPaid = () => {
    return lineItemPayments.reduce((sum, item) => sum + item.previouslyPaid, 0);
  };

  const calculatePaymentSubtotal = () => {
    const total = calculateTotalPayment();
    // If VAT is inclusive, extract the subtotal by dividing by 1.15
    // Otherwise, the line item totals are already the subtotal
    const vatTreatment = isFromPO ? selectedPO?.vatStatus : selectedInvoice?.vatTreatment;
    return vatTreatment === 'inclusive' ? total / 1.15 : total;
  };

  const calculatePaymentVAT = () => {
    const vatTreatment = isFromPO ? selectedPO?.vatStatus : selectedInvoice?.vatTreatment;
    if (vatTreatment === 'not_applicable') {
      return 0;
    }
    const subtotal = calculatePaymentSubtotal();
    if (vatTreatment === 'inclusive') {
      // VAT is already included, so extract it
      return calculateTotalPayment() - subtotal;
    } else {
      // VAT is exclusive, so calculate it
      return subtotal * 0.15;
    }
  };

  const calculatePaymentTotal = () => {
    const subtotal = calculatePaymentSubtotal();
    const vat = calculatePaymentVAT();
    const vatTreatment = isFromPO ? selectedPO?.vatStatus : selectedInvoice?.vatTreatment;
    
    if (vatTreatment === 'inclusive') {
      // VAT already included in line item amounts
      return calculateTotalPayment();
    } else if (vatTreatment === 'exclusive') {
      // Add VAT to subtotal
      return subtotal + vat;
    } else {
      // No VAT
      return subtotal;
    }
  };

  const handleCreatePayment = () => {
    const payment = {
      projectId,
      vendorId: newPayment.vendorId,
      poId: newPayment.poId === 'none' ? null : newPayment.poId || null,
      invoiceId: newPayment.invoiceId === 'none' ? null : newPayment.invoiceId || null,
      amount: (isFromPO || isFromInvoice) ? calculatePaymentTotal() : newPayment.amount,
      subtotal: (isFromPO || isFromInvoice) ? calculatePaymentSubtotal() : undefined,
      vat: (isFromPO || isFromInvoice) ? calculatePaymentVAT() : undefined,
      vatTreatment: (isFromPO || isFromInvoice) ? (isFromPO ? selectedPO?.vatStatus : selectedInvoice?.vatTreatment) : undefined,
      paymentMethod: newPayment.paymentMethod,
      referenceNumber: newPayment.referenceNumber,
      paymentDate: newPayment.paymentDate,
      notes: newPayment.notes,
      type: 'payment' as const,
      status: 'pending_approval' as const,
      lineItemPayments: (isFromPO || isFromInvoice) ? lineItemPayments : undefined,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
    };

    dataStore.addPayment(payment);
    loadData();
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setIsFromPO(false);
    setIsFromInvoice(false);
    setIsEditMode(false);
    setEditingPaymentId(null);
    setSelectedPO(null);
    setSelectedInvoice(null);
    setLineItemPayments([]);
    setPaymentNumber('');
    setNewPayment({
      vendorId: '',
      poId: '',
      invoiceId: '',
      amount: 0,
      paymentMethod: 'bank_transfer',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    onDataUsed();
  };

  const handleUpdatePayment = () => {
    if (!editingPaymentId) return;
    const updates = {
      vendorId: newPayment.vendorId,
      poId: newPayment.poId === 'none' ? null : newPayment.poId || null,
      invoiceId: newPayment.invoiceId === 'none' ? null : newPayment.invoiceId || null,
      amount: newPayment.amount,
      paymentMethod: newPayment.paymentMethod,
      referenceNumber: newPayment.referenceNumber,
      paymentDate: newPayment.paymentDate,
      notes: newPayment.notes,
    };
    dataStore.updatePayment(editingPaymentId, updates);
    loadData();
    setEditingPaymentId(null);
    setIsEditMode(false);
    handleCloseDialog();
  };

  const handleEditPayment = (payment: any) => {
    setEditingPaymentId(payment.id);
    setIsEditMode(true);
    setIsFromPO(false);
    setIsFromInvoice(false);
    setSelectedPO(null);
    setSelectedInvoice(null);
    setLineItemPayments([]);
    setPaymentNumber(payment.paymentNumber || '');
    setNewPayment({
      vendorId: payment.vendorId || '',
      poId: payment.poId || '',
      invoiceId: payment.invoiceId || '',
      amount: payment.amount || 0,
      paymentMethod: payment.paymentMethod || 'bank_transfer',
      referenceNumber: payment.referenceNumber || '',
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      notes: payment.notes || '',
    });
    setDialogOpen(true);
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.name : 'Unknown Vendor';
  };

  const getPONumber = (poId: string) => {
    if (!poId) return '-';
    const po = purchaseOrders.find(p => p.id === poId);
    return po ? po.poNumber : '-';
  };

  const getInvoiceNumber = (invoiceId: string) => {
    if (!invoiceId) return '-';
    const invoice = invoices.find(i => i.id === invoiceId);
    return invoice ? invoice.invoiceNumber : '-';
  };

  // Calculate payment statistics - only count payments marked as 'paid'
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  
  // Total committed should be unique PO values only (not PO + Invoices, as invoices are linked to POs)
  // Sum of all approved POs for this project
  const totalCommitted = purchaseOrders
    .filter(po => po.status === 'approved' || po.status === 'partially_paid' || po.status === 'paid')
    .reduce((sum, po) => sum + po.total, 0);
  
  const remainingToPay = totalCommitted - totalPaid;

  // Status badge helper
  const getStatusBadge = (status?: string) => {
    const statusValue = status || 'pending_approval';
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: FileText },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      paid: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
    };
    const config = statusConfig[statusValue as keyof typeof statusConfig] || statusConfig.pending_approval;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {statusValue.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // View/Edit handlers
  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
    setIsEditMode(false);
    setViewDialogOpen(true);
  };

  // Check edit permissions
  const canEdit = (payment: any) => {
    if (currentUser.role === 'admin') return true;
    if (payment.status === 'pending_approval' && payment.createdBy === currentUser.id) return true;
    return false;
  };

  const handleApprovePayment = () => {
    if (selectedPayment) {
      dataStore.updatePayment(selectedPayment.id, {
        status: 'approved',
        approvedBy: currentUser.id,
        approvedByName: currentUser.name,
        approvedDate: new Date().toISOString(),
      });
      loadData();
      setViewDialogOpen(false);
      setSelectedPayment(null);
    }
  };

  const handleRejectPayment = () => {
    if (selectedPayment && rejectionReason.trim()) {
      dataStore.updatePayment(selectedPayment.id, {
        status: 'rejected',
        rejectedBy: currentUser.id,
        rejectedByName: currentUser.name,
        rejectedDate: new Date().toISOString(),
        rejectionReason: rejectionReason,
      });
      loadData();
      setRejectionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
    }
  };

  const handleRequestModification = () => {
    if (selectedPayment && modificationRequestReason.trim()) {
      // In a real system, this would send a notification to admin
      alert(`Modification request sent to admin: ${modificationRequestReason}`);
      setModificationRequestDialogOpen(false);
      setModificationRequestReason('');
    }
  };

  const handleMarkAsPaid = async () => {
    if (selectedPayment) {
      // Update payment status to paid
      dataStore.updatePayment(selectedPayment.id, {
        status: 'paid',
        paidBy: currentUser.id,
        paidByName: currentUser.name,
        paidDate: new Date().toISOString(),
      });

      // If payment is linked to a PO, update budget and PO status
      if (selectedPayment.poId) {
        const po = purchaseOrders.find(p => p.id === selectedPayment.poId);
        if (po) {
          // Update budget actual amount
          await dataStore.updateBudgetActual(projectId, po, selectedPayment);

          // Calculate total paid for this PO
          const allPayments = await dataStore.getPayments(projectId);
          const poPaidPayments = allPayments.filter((p: any) =>
            p.poId === selectedPayment.poId && 
            p.type === 'payment' && 
            p.status === 'paid'
          );
          const totalPaidForPO = poPaidPayments.reduce((sum: number, p: any) => sum + p.amount, 0);

          // Determine PO payment status
          let newPOStatus = po.status;
          if (totalPaidForPO >= po.total) {
            newPOStatus = 'paid';
          } else if (totalPaidForPO > 0) {
            newPOStatus = 'partially_paid';
          }

          // Update PO status if it changed
          if (newPOStatus !== po.status) {
            await dataStore.updatePurchaseOrder(po.id, { status: newPOStatus });
          }
        }
      }

      loadData();
      setViewDialogOpen(false);
      setSelectedPayment(null);
    }
  };

  const handlePrintPDF = (payment: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const vendor = vendors.find(v => v.id === payment.vendorId);
    const po = payment.poId ? purchaseOrders.find(p => p.id === payment.poId) : null;
    const invoice = payment.invoiceId ? invoices.find(i => i.id === payment.invoiceId) : null;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Request - ${payment.paymentNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');
          body {
            font-family: 'Almarai', sans-serif;
            padding: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #7A1516;
            padding-bottom: 20px;
          }
          .company-name {
            font-size: 28px;
            font-weight: 800;
            color: #7A1516;
            margin-bottom: 5px;
          }
          .document-title {
            font-size: 20px;
            font-weight: 700;
            margin-top: 10px;
          }
          .info-section {
            margin: 20px 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .info-box {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 14px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: 700;
          }
          .text-right {
            text-align: right;
          }
          .total-row {
            background-color: #f9f9f9;
            font-weight: 700;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 700;
          }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-approved { background-color: #d1fae5; color: #065f46; }
          .status-rejected { background-color: #fee2e2; color: #991b1b; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">CORE CODE</div>
          <div class="document-title">PAYMENT REQUEST</div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-label">Payment Number</div>
            <div class="info-value">${payment.paymentNumber}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Payment Date</div>
            <div class="info-value">${new Date(payment.paymentDate).toLocaleDateString()}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Vendor</div>
            <div class="info-value">${vendor?.name || 'Unknown'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${payment.status.replace('_', '-')}">
                ${payment.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          ${po ? `
          <div class="info-box">
            <div class="info-label">Related PO</div>
            <div class="info-value">${po.poNumber}</div>
          </div>
          ` : ''}
          ${invoice ? `
          <div class="info-box">
            <div class="info-label">Related Invoice</div>
            <div class="info-value">${invoice.invoiceNumber}</div>
          </div>
          ` : ''}
          <div class="info-box">
            <div class="info-label">Payment Method</div>
            <div class="info-value">${payment.paymentMethod.replace('_', ' ').toUpperCase()}</div>
          </div>
          ${payment.referenceNumber ? `
          <div class="info-box">
            <div class="info-label">Reference Number</div>
            <div class="info-value">${payment.referenceNumber}</div>
          </div>
          ` : ''}
          <div class="info-box">
            <div class="info-label">Created By</div>
            <div class="info-value">${payment.createdByName || 'Unknown'}</div>
          </div>
          ${payment.vatTreatment ? `
          <div class="info-box">
            <div class="info-label">VAT Treatment</div>
            <div class="info-value" style="text-transform: capitalize;">${
              payment.vatTreatment === 'exclusive' ? 'Exclusive' :
              payment.vatTreatment === 'inclusive' ? 'Inclusive' :
              'Not Applicable'
            }</div>
          </div>
          ` : ''}
        </div>

        ${payment.lineItemPayments && payment.lineItemPayments.length > 0 ? `
        <h3>Line Item Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Line Total</th>
              <th class="text-right">Payment Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payment.lineItemPayments.map((item: any) => `
            <tr>
              <td>${item.description}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${item.unitPrice.toLocaleString()} SAR</td>
              <td class="text-right">${item.lineTotal.toLocaleString()} SAR</td>
              <td class="text-right">${item.paymentAmount.toLocaleString()} SAR</td>
            </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-right">Subtotal:</td>
              <td class="text-right"><strong>${(payment.subtotal || payment.amount).toLocaleString()} SAR</strong></td>
            </tr>
            ${payment.vat ? `
            <tr>
              <td colspan="4" class="text-right">VAT (15%):</td>
              <td class="text-right"><strong>${payment.vat.toLocaleString()} SAR</strong></td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td colspan="4" class="text-right">TOTAL AMOUNT:</td>
              <td class="text-right"><strong>${payment.amount.toLocaleString()} SAR</strong></td>
            </tr>
          </tfoot>
        </table>
        ` : `
        <table>
          <tr>
            <td><strong>Total Payment Amount:</strong></td>
            <td class="text-right"><strong>${payment.amount.toLocaleString()} SAR</strong></td>
          </tr>
        </table>
        `}

        ${payment.notes ? `
        <div style="margin: 20px 0;">
          <h3>Notes:</h3>
          <p style="white-space: pre-wrap;">${payment.notes}</p>
        </div>
        ` : ''}

        ${payment.approvedByName ? `
        <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border-left: 3px solid #10b981;">
          <strong>Approved by:</strong> ${payment.approvedByName}<br>
          <strong>Approved on:</strong> ${new Date(payment.approvedDate).toLocaleString()}
        </div>
        ` : ''}

        ${payment.rejectedByName ? `
        <div style="margin: 20px 0; padding: 15px; background: #fef2f2; border-left: 3px solid #ef4444;">
          <strong>Rejected by:</strong> ${payment.rejectedByName}<br>
          <strong>Rejected on:</strong> ${new Date(payment.rejectedDate).toLocaleString()}<br>
          <strong>Reason:</strong> ${payment.rejectionReason}
        </div>
        ` : ''}

        ${payment.paidByName ? `
        <div style="margin: 20px 0; padding: 15px; background: #eff6ff; border-left: 3px solid #3b82f6;">
          <strong>Marked as Paid by:</strong> ${payment.paidByName}<br>
          <strong>Paid on:</strong> ${new Date(payment.paidDate).toLocaleString()}
        </div>
        ` : ''}

        <div class="footer">
          <p>This is a computer-generated document. For questions, please contact Core Code.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #7A1516; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
            Print / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vendor Payments & Progress Invoices</h3>
          <p className="text-sm text-gray-500">Manage vendor payment requests and progress billing for this project</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Request Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[98vw] max-w-[98vw] sm:max-w-[96vw] md:max-w-[94vw] lg:max-w-[92vw] xl:max-w-[90vw] 2xl:max-w-[88vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? `Edit Payment ${paymentNumber}` : isFromPO ? `Payment Request for PO ${selectedPO?.poNumber}` : isFromInvoice ? `Payment Request for Invoice ${selectedInvoice?.invoiceNumber}` : 'Payment Request'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isFromPO && selectedPO ? (
                // Comprehensive PO-based payment form
                <>
                  {/* Payment Number and PO Info Header */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Payment Number</Label>
                        <div className="font-mono font-semibold text-lg">{paymentNumber}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">PO Number</Label>
                        <div className="font-mono font-semibold">{selectedPO.poNumber}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Vendor</Label>
                        <div className="font-semibold">{getVendorName(selectedPO.vendorId)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">PO Status</Label>
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded capitalize bg-green-100 text-green-800">
                          {selectedPO.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PO Financial Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        PO Financial Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Subtotal</div>
                          <div className="text-lg font-semibold">{selectedPO.subtotal.toLocaleString()} SAR</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">VAT (15%)</div>
                          <div className="text-lg font-semibold">{selectedPO.vat.toLocaleString()} SAR</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Total Amount</div>
                          <div className="text-lg font-bold text-[#7A1516]">{selectedPO.total.toLocaleString()} SAR</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">VAT Status</div>
                          <div className="text-sm font-medium capitalize">{selectedPO.vatStatus}</div>
                        </div>
                      </div>

                      {/* Payment Terms */}
                      {selectedPO.paymentTerms && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-xs text-gray-500 mb-1">Payment Terms</div>
                          <div className="text-sm font-medium text-gray-700">{selectedPO.paymentTerms}</div>
                        </div>
                      )}

                      {/* Terms and Conditions */}
                      {selectedPO.termsAndConditions && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-xs text-gray-500 mb-1">Terms and Conditions</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPO.termsAndConditions}</div>
                        </div>
                      )}

                      {/* Notes */}
                      {selectedPO.notes && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-xs text-gray-500 mb-1">Notes</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPO.notes}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Line Items Payment Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Line Items - Payment Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">Description</th>
                              <th className="text-center py-2 px-2">Qty</th>
                              <th className="text-right py-2 px-2">Unit Price</th>
                              <th className="text-right py-2 px-2">Line Total</th>
                              <th className="text-right py-2 px-2">Previously Paid</th>
                              <th className="text-right py-2 px-2">Remaining</th>
                              <th className="text-left py-2 px-2">Payment Type</th>
                              <th className="text-left py-2 px-2">Value</th>
                              <th className="text-right py-2 px-2 font-semibold">Payment Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineItemPayments.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-3 px-2">{item.description}</td>
                                <td className="text-center py-3 px-2">{item.quantity}</td>
                                <td className="text-right py-3 px-2">{item.unitPrice.toLocaleString()}</td>
                                <td className="text-right py-3 px-2 font-medium">{item.lineTotal.toLocaleString()}</td>
                                <td className="text-right py-3 px-2 text-orange-600">
                                  {item.previouslyPaid > 0 ? item.previouslyPaid.toLocaleString() : '-'}
                                </td>
                                <td className="text-right py-3 px-2 font-semibold text-blue-600">
                                  {item.remaining.toLocaleString()}
                                </td>
                                <td className="py-3 px-2">
                                  <Select 
                                    value={item.paymentType} 
                                    onValueChange={(value) => handleLineItemPaymentChange(index, 'paymentType', value)}
                                  >
                                    <SelectTrigger className="w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="full">Full Remaining</SelectItem>
                                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                                      <SelectItem value="percentage">Percentage</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="py-3 px-2">
                                  {item.paymentType === 'full' ? (
                                    <div className="text-center text-gray-400">-</div>
                                  ) : (
                                    <Input
                                      type="number"
                                      className="w-[100px]"
                                      value={item.paymentValue}
                                      onChange={(e) => handleLineItemPaymentChange(index, 'paymentValue', e.target.value)}
                                      placeholder={item.paymentType === 'fixed' ? '0.00' : '0'}
                                      min="0"
                                      max={item.paymentType === 'percentage' ? 100 : undefined}
                                    />
                                  )}
                                </td>
                                <td className="text-right py-3 px-2 font-bold text-green-600">
                                  {item.paymentAmount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2">
                              <td colSpan={8} className="text-right py-3 px-2 font-semibold">
                                Payment Subtotal:
                              </td>
                              <td className="text-right py-3 px-2 font-bold">
                                {calculatePaymentSubtotal().toLocaleString()} SAR
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={8} className="text-right py-3 px-2 font-semibold">
                                VAT (15%):
                              </td>
                              <td className="text-right py-3 px-2 font-bold">
                                {calculatePaymentVAT().toLocaleString()} SAR
                              </td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td colSpan={8} className="text-right py-3 px-2 font-bold text-lg">
                                Total Payment Amount:
                              </td>
                              <td className="text-right py-3 px-2 font-bold text-lg text-[#7A1516]">
                                {calculatePaymentTotal().toLocaleString()} SAR
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Request Summary - VAT Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Payment Request Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Subtotal (Line Items)</span>
                          <span className="font-semibold">{calculatePaymentSubtotal().toLocaleString()} SAR</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">VAT (15%)</span>
                          <span className="font-semibold">{calculatePaymentVAT().toLocaleString()} SAR</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-[#7A1516] bg-opacity-10 px-3 rounded">
                          <span className="font-bold text-[#7A1516]">Total Payment Request</span>
                          <span className="font-bold text-lg text-[#7A1516]">{calculatePaymentTotal().toLocaleString()} SAR</span>
                        </div>
                        <div className="text-xs text-gray-500 text-center pt-2">
                          {selectedPO.vatStatus === 'exclusive' && 'VAT will be added to the line item amounts'}
                          {selectedPO.vatStatus === 'inclusive' && 'VAT is already included in the line item amounts'}
                          {selectedPO.vatStatus === 'not_applicable' && 'No VAT applied to this payment request'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-4">
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
                      <Select value={newPayment.paymentMethod} onValueChange={(value: any) => setNewPayment({ ...newPayment, paymentMethod: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input
                        value={newPayment.referenceNumber}
                        onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                        placeholder="Enter reference number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreatePayment} 
                      className="bg-[#7A1516] hover:bg-[#5A1012]"
                      disabled={!newPayment.paymentDate || calculatePaymentTotal() === 0}
                    >
                      Send Request - {calculatePaymentTotal().toLocaleString()} SAR
                    </Button>
                  </div>
                </>
              ) : isFromInvoice && selectedInvoice ? (
                // Comprehensive Invoice-based payment form
                <>
                  {/* Payment Number and Invoice Info Header */}
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Payment Number</Label>
                        <div className="font-mono font-semibold text-lg">{paymentNumber}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Invoice Number</Label>
                        <div className="font-mono font-semibold">{selectedInvoice.invoiceNumber}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Vendor</Label>
                        <div className="font-semibold">{getVendorName(selectedInvoice.vendorId)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Invoice Status</Label>
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded capitalize bg-green-100 text-green-800">
                          {selectedInvoice.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Financial Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Invoice Financial Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Subtotal</div>
                          <div className="text-lg font-semibold">{selectedInvoice.subtotal.toLocaleString()} SAR</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">VAT (15%)</div>
                          <div className="text-lg font-semibold">{selectedInvoice.vat.toLocaleString()} SAR</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">Total Invoice</div>
                          <div className="text-lg font-semibold text-[#7A1516]">{selectedInvoice.total.toLocaleString()} SAR</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">VAT Treatment</div>
                          <div className="text-sm font-medium capitalize">
                            {selectedInvoice.vatTreatment === 'exclusive' && 'Exclusive'}
                            {selectedInvoice.vatTreatment === 'inclusive' && 'Inclusive'}
                            {selectedInvoice.vatTreatment === 'not_applicable' && 'Not Applicable'}
                          </div>
                        </div>
                      </div>

                      {/* VAT Treatment Explanation */}
                      <div className={`p-3 rounded-lg mb-4 ${
                        selectedInvoice.vatTreatment === 'exclusive' ? 'bg-blue-50 border border-blue-200' :
                        selectedInvoice.vatTreatment === 'inclusive' ? 'bg-purple-50 border border-purple-200' :
                        'bg-gray-50 border border-gray-200'
                      }`}>
                        <p className="text-sm font-medium">
                          {selectedInvoice.vatTreatment === 'exclusive' && '✓ VAT Exclusive: VAT (15%) is calculated separately and added to line item totals'}
                          {selectedInvoice.vatTreatment === 'inclusive' && '✓ VAT Inclusive: VAT (15%) is already included in the line item prices'}
                          {selectedInvoice.vatTreatment === 'not_applicable' && '✓ VAT Not Applicable: No VAT will be applied to this payment request'}
                        </p>
                      </div>

                      {/* Progress bar for total invoice payment */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Invoice Payment Progress</span>
                          <span>{((calculateTotalPreviouslyPaid() + calculatePaymentTotal()) / selectedInvoice.total * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-green-500 h-3 rounded-full transition-all" 
                            style={{ width: `${Math.min((calculateTotalPreviouslyPaid() + calculatePaymentTotal()) / selectedInvoice.total * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Paid: {calculateTotalPreviouslyPaid().toLocaleString()} SAR</span>
                          <span>Remaining: {(selectedInvoice.total - calculateTotalPreviouslyPaid() - calculatePaymentTotal()).toLocaleString()} SAR</span>
                        </div>
                      </div>

                      {/* Invoice description and notes */}
                      {selectedInvoice.description && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-xs text-gray-500 mb-1">Description</div>
                          <div className="text-sm text-gray-700">{selectedInvoice.description}</div>
                        </div>
                      )}
                      
                      {selectedInvoice.notes && (
                        <div className="border-t pt-3 mt-3">
                          <div className="text-xs text-gray-500 mb-1">Notes</div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedInvoice.notes}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Line Items Payment Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Payment Details by Line Item</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 border">Description</th>
                              <th className="text-right p-3 border w-24">Qty</th>
                              <th className="text-right p-3 border w-32">Unit Price</th>
                              <th className="text-right p-3 border w-32">Line Total</th>
                              <th className="text-right p-3 border w-32">Previously Paid</th>
                              <th className="text-right p-3 border w-32">Remaining</th>
                              <th className="text-center p-3 border w-40">Payment Type</th>
                              <th className="text-center p-3 border w-40">Value</th>
                              <th className="text-right p-3 border w-32 bg-blue-50">Payment Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lineItemPayments.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="p-3 border">{item.description}</td>
                                <td className="text-right p-3 border">{item.quantity}</td>
                                <td className="text-right p-3 border">{item.unitPrice.toLocaleString()} SAR</td>
                                <td className="text-right p-3 border font-semibold">{item.lineTotal.toLocaleString()} SAR</td>
                                <td className="text-right p-3 border text-gray-600">{item.previouslyPaid.toLocaleString()} SAR</td>
                                <td className="text-right p-3 border text-blue-600 font-semibold">{item.remaining.toLocaleString()} SAR</td>
                                <td className="p-2 border">
                                  <Select 
                                    value={item.paymentType} 
                                    onValueChange={(value) => handleLineItemPaymentChange(index, 'paymentType', value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="full">Full Remaining</SelectItem>
                                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                                      <SelectItem value="percentage">Percentage</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="p-2 border">
                                  {item.paymentType === 'full' ? (
                                    <div className="text-center text-xs text-gray-500">100%</div>
                                  ) : (
                                    <Input
                                      type="number"
                                      className="h-8 text-xs"
                                      value={item.paymentValue}
                                      onChange={(e) => handleLineItemPaymentChange(index, 'paymentValue', e.target.value)}
                                      placeholder={item.paymentType === 'fixed' ? 'Amount' : '%'}
                                      min="0"
                                      max={item.paymentType === 'percentage' ? '100' : undefined}
                                      step={item.paymentType === 'percentage' ? '1' : '0.01'}
                                    />
                                  )}
                                </td>
                                <td className="text-right p-3 border bg-blue-50 font-bold text-green-600">
                                  {item.paymentAmount.toLocaleString()} SAR
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2">
                              <td colSpan={8} className="text-right py-3 px-2 font-semibold">
                                Payment Subtotal:
                              </td>
                              <td className="text-right py-3 px-2 font-bold">
                                {calculatePaymentSubtotal().toLocaleString()} SAR
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={8} className="text-right py-3 px-2 font-semibold">
                                VAT (15%):
                              </td>
                              <td className="text-right py-3 px-2 font-bold">
                                {calculatePaymentVAT().toLocaleString()} SAR
                              </td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td colSpan={8} className="text-right py-3 px-2 font-bold text-lg">
                                Total Payment Amount:
                              </td>
                              <td className="text-right py-3 px-2 font-bold text-lg text-[#7A1516]">
                                {calculatePaymentTotal().toLocaleString()} SAR
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Request Summary - VAT Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Payment Request Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">Subtotal (Line Items)</span>
                          <span className="font-semibold">{calculatePaymentSubtotal().toLocaleString()} SAR</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-gray-600">VAT (15%)</span>
                          <span className="font-semibold">{calculatePaymentVAT().toLocaleString()} SAR</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-[#7A1516] bg-opacity-10 px-3 rounded">
                          <span className="font-bold text-[#7A1516]">Total Payment Request</span>
                          <span className="font-bold text-lg text-[#7A1516]">{calculatePaymentTotal().toLocaleString()} SAR</span>
                        </div>
                        <div className="text-xs text-gray-500 text-center pt-2">
                          {selectedInvoice.vatTreatment === 'exclusive' && 'VAT will be added to the line item amounts'}
                          {selectedInvoice.vatTreatment === 'inclusive' && 'VAT is already included in the line item amounts'}
                          {selectedInvoice.vatTreatment === 'not_applicable' && 'No VAT applied to this payment request'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-4">
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
                      <Select value={newPayment.paymentMethod} onValueChange={(value: any) => setNewPayment({ ...newPayment, paymentMethod: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input
                        value={newPayment.referenceNumber}
                        onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                        placeholder="Enter reference number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreatePayment} 
                      className="bg-[#7A1516] hover:bg-[#5A1012]"
                      disabled={!newPayment.paymentDate || calculatePaymentTotal() === 0}
                    >
                      Send Request - {calculatePaymentTotal().toLocaleString()} SAR
                    </Button>
                  </div>
                </>
              ) : (
                // Simple payment form (not from PO)
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vendor *</Label>
                      <VendorSelector
                        value={newPayment.vendorId}
                        onChange={(value) => setNewPayment({ ...newPayment, vendorId: value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Related PO (Optional)</Label>
                      <Select value={newPayment.poId} onValueChange={(value) => setNewPayment({ ...newPayment, poId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PO (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {purchaseOrders.map(po => (
                            <SelectItem key={po.id} value={po.id}>{po.poNumber} - {po.description}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Related Invoice (Optional)</Label>
                      <Select value={newPayment.invoiceId} onValueChange={(value) => setNewPayment({ ...newPayment, invoiceId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select invoice (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {invoices.map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.description}</SelectItem>
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
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Method *</Label>
                      <Select value={newPayment.paymentMethod} onValueChange={(value: any) => setNewPayment({ ...newPayment, paymentMethod: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input
                        value={newPayment.referenceNumber}
                        onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                        placeholder="Enter reference number"
                      />
                    </div>
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
                    <Label>Notes</Label>
                    <Textarea
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={isEditMode ? handleUpdatePayment : handleCreatePayment}
                      className="bg-[#7A1516] hover:bg-[#5A1012]"
                      disabled={!newPayment.vendorId || !newPayment.amount || !newPayment.paymentDate}
                    >
                      {isEditMode ? 'Save Changes' : 'Send Request'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Payments</div>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Paid</div>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              {totalPaid.toLocaleString()} SAR
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Committed</div>
            <div className="text-2xl font-bold">
              {totalCommitted.toLocaleString()} SAR
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Remaining to Pay</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${remainingToPay >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {remainingToPay >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {Math.abs(remainingToPay).toLocaleString()} SAR
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Payment ID</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Vendor</th>
                  <th className="text-left py-3 px-4">PO Number</th>
                  <th className="text-left py-3 px-4">Invoice Number</th>
                  <th className="text-left py-3 px-4">Method</th>
                  <th className="text-left py-3 px-4">Reference</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewPayment(payment)}
                  >
                    <td className="py-3 px-4 font-mono text-sm">{payment.paymentNumber}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getVendorName(payment.vendorId)}</td>
                    <td className="py-3 px-4 font-mono text-sm">{getPONumber(payment.poId)}</td>
                    <td className="py-3 px-4 font-mono text-sm">{getInvoiceNumber(payment.invoiceId)}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                        {payment.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{payment.referenceNumber || '-'}</td>
                    <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                    <td className="text-right py-3 px-4 font-semibold text-green-600">
                      {payment.amount.toLocaleString()} SAR
                    </td>
                    <td className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewPayment(payment)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(payment.status === 'pending_approval' || payment.status === 'draft' || currentUser.role === 'admin') && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditPayment(payment)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit Payment"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handlePrintPDF(payment)}
                          className="text-green-600 hover:text-green-700"
                          title="Print/Export PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        {(payment.status === 'pending_approval' || payment.status === 'draft' || currentUser.role === 'admin') && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete payment ${payment.paymentNumber}? This action cannot be undone.`)) {
                                await dataStore.deletePayment(payment.id);
                                await loadData();
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">
                      No payment requests yet. Create your first payment request!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View/Edit Payment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] sm:max-w-[96vw] md:max-w-[94vw] lg:max-w-[92vw] xl:max-w-[90vw] 2xl:max-w-[88vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payment Request Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Payment Number</Label>
                <div className="font-mono font-semibold text-lg">{selectedPayment?.paymentNumber}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Payment Date</Label>
                <div className="font-mono font-semibold">{new Date(selectedPayment?.paymentDate).toLocaleDateString()}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Vendor</Label>
                <div className="font-semibold">{getVendorName(selectedPayment?.vendorId)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <div className="font-semibold">{getStatusBadge(selectedPayment?.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Related PO</Label>
                <div className="font-mono font-semibold">{getPONumber(selectedPayment?.poId)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Related Invoice</Label>
                <div className="font-mono font-semibold">{getInvoiceNumber(selectedPayment?.invoiceId)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Payment Method</Label>
                <div className="font-mono font-semibold">{selectedPayment?.paymentMethod.replace('_', ' ').toUpperCase()}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Reference Number</Label>
                <div className="font-mono font-semibold">{selectedPayment?.referenceNumber || '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Created By</Label>
                <div className="font-mono font-semibold">{selectedPayment?.createdByName || 'Unknown'}</div>
              </div>
              {selectedPayment?.vatTreatment && (
                <div>
                  <Label className="text-xs text-gray-500">VAT Treatment</Label>
                  <div className="font-semibold capitalize">
                    {selectedPayment.vatTreatment === 'exclusive' && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">
                        Exclusive
                      </span>
                    )}
                    {selectedPayment.vatTreatment === 'inclusive' && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-purple-100 text-purple-800 text-sm">
                        Inclusive
                      </span>
                    )}
                    {selectedPayment.vatTreatment === 'not_applicable' && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-800 text-sm">
                        Not Applicable
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedPayment?.lineItemPayments && selectedPayment?.lineItemPayments.length > 0 ? (
              <div>
                <h3>Line Item Breakdown</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Description</th>
                      <th className="text-center py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Unit Price</th>
                      <th className="text-right py-2 px-2">Line Total</th>
                      <th className="text-right py-2 px-2">Payment Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPayment?.lineItemPayments.map((item: any) => (
                      <tr key={item.description} className="border-b">
                        <td className="py-3 px-2">{item.description}</td>
                        <td className="text-center py-3 px-2">{item.quantity}</td>
                        <td className="text-right py-3 px-2">{item.unitPrice.toLocaleString()} SAR</td>
                        <td className="text-right py-3 px-2 font-medium">{item.lineTotal.toLocaleString()} SAR</td>
                        <td className="text-right py-3 px-2 font-bold text-green-600">
                          {item.paymentAmount.toLocaleString()} SAR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right py-3 px-2 font-semibold">
                        Subtotal:
                      </td>
                      <td className="text-right py-3 px-2 font-bold">
                        {(selectedPayment?.subtotal || selectedPayment?.amount).toLocaleString()} SAR
                      </td>
                    </tr>
                    {selectedPayment?.vat ? (
                      <tr>
                        <td colSpan={4} className="text-right py-3 px-2 font-semibold">
                          VAT (15%):
                        </td>
                        <td className="text-right py-3 px-2 font-bold">
                          {selectedPayment?.vat.toLocaleString()} SAR
                        </td>
                      </tr>
                    ) : null}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="text-right py-3 px-2 font-bold text-lg">
                        TOTAL AMOUNT:
                      </td>
                      <td className="text-right py-3 px-2 font-bold text-lg text-[#7A1516]">
                        {selectedPayment?.amount.toLocaleString()} SAR
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td><strong>Total Payment Amount:</strong></td>
                      <td className="text-right"><strong>{selectedPayment?.amount.toLocaleString()} SAR</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {selectedPayment?.notes ? (
              <div className="my-5">
                <h3>Notes:</h3>
                <p className="whitespace-pre-wrap">{selectedPayment?.notes}</p>
              </div>
            ) : null}

            {selectedPayment?.approvedByName ? (
              <div className="my-5 p-4 bg-green-50 border-l-4 border-green-500">
                <div><strong>Approved by:</strong> {selectedPayment?.approvedByName}</div>
                <div><strong>Approved on:</strong> {new Date(selectedPayment?.approvedDate).toLocaleString()}</div>
              </div>
            ) : null}

            {selectedPayment?.rejectedByName ? (
              <div className="my-5 p-4 bg-red-50 border-l-4 border-red-500">
                <div><strong>Rejected by:</strong> {selectedPayment?.rejectedByName}</div>
                <div><strong>Rejected on:</strong> {new Date(selectedPayment?.rejectedDate).toLocaleString()}</div>
                <div><strong>Reason:</strong> {selectedPayment?.rejectionReason}</div>
              </div>
            ) : null}

            {selectedPayment?.paidByName ? (
              <div className="my-5 p-4 bg-blue-50 border-l-4 border-blue-500">
                <div><strong>Marked as Paid by:</strong> {selectedPayment?.paidByName}</div>
                <div><strong>Paid on:</strong> {new Date(selectedPayment?.paidDate).toLocaleString()}</div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              
              {/* Admin Actions - Approve/Reject */}
              {currentUser.role === 'admin' && selectedPayment?.status === 'pending_approval' && (
                <>
                  <Button 
                    onClick={handleApprovePayment} 
                    className="bg-[#7A1516] hover:bg-[#5A1012]"
                  >
                    Approve Payment
                  </Button>
                  <Button 
                    onClick={() => setRejectionDialogOpen(true)} 
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Reject Payment
                  </Button>
                </>
              )}

              {/* Admin Action - Mark as Paid */}
              {currentUser.role === 'admin' && selectedPayment?.status === 'approved' && (
                <Button 
                  onClick={handleMarkAsPaid} 
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Mark as Paid
                </Button>
              )}
              
              {/* User Action - Request Modification */}
              {currentUser.role !== 'admin' && 
               selectedPayment?.createdBy === currentUser.id && 
               selectedPayment?.status === 'pending_approval' && (
                <Button 
                  onClick={() => setModificationRequestDialogOpen(true)} 
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  Request Modification
                </Button>
              )}
              
              <Button 
                onClick={() => handlePrintPDF(selectedPayment)} 
                className="bg-gray-500 hover:bg-gray-600"
              >
                Print PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] sm:max-w-[96vw] md:max-w-[94vw] lg:max-w-[92vw] xl:max-w-[90vw] 2xl:max-w-[88vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Reject Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Payment Number</Label>
                <div className="font-mono font-semibold text-lg">{selectedPayment?.paymentNumber}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Payment Date</Label>
                <div className="font-mono font-semibold">{new Date(selectedPayment?.paymentDate).toLocaleDateString()}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Vendor</Label>
                <div className="font-semibold">{getVendorName(selectedPayment?.vendorId)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <div className="font-semibold">{getStatusBadge(selectedPayment?.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Related PO</Label>
                <div className="font-mono font-semibold">{getPONumber(selectedPayment?.poId)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Payment Method</Label>
                <div className="font-mono font-semibold">{selectedPayment?.paymentMethod.replace('_', ' ').toUpperCase()}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Reference Number</Label>
                <div className="font-mono font-semibold">{selectedPayment?.referenceNumber || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Created By</Label>
                <div className="font-mono font-semibold">{selectedPayment?.createdByName || 'Unknown'}</div>
              </div>
            </div>

            {selectedPayment?.lineItemPayments && selectedPayment?.lineItemPayments.length > 0 ? (
              <div>
                <h3>Line Item Breakdown</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Description</th>
                      <th className="text-center py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Unit Price</th>
                      <th className="text-right py-2 px-2">Line Total</th>
                      <th className="text-right py-2 px-2">Payment Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPayment?.lineItemPayments.map((item: any) => (
                      <tr key={item.description} className="border-b">
                        <td className="py-3 px-2">{item.description}</td>
                        <td className="text-center py-3 px-2">{item.quantity}</td>
                        <td className="text-right py-3 px-2">{item.unitPrice.toLocaleString()} SAR</td>
                        <td className="text-right py-3 px-2 font-medium">{item.lineTotal.toLocaleString()} SAR</td>
                        <td className="text-right py-3 px-2 font-bold text-green-600">
                          {item.paymentAmount.toLocaleString()} SAR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right py-3 px-2 font-semibold">
                        Subtotal:
                      </td>
                      <td className="text-right py-3 px-2 font-bold">
                        {(selectedPayment?.subtotal || selectedPayment?.amount).toLocaleString()} SAR
                      </td>
                    </tr>
                    {selectedPayment?.vat ? (
                      <tr>
                        <td colSpan={4} className="text-right py-3 px-2 font-semibold">
                          VAT (15%):
                        </td>
                        <td className="text-right py-3 px-2 font-bold">
                          {selectedPayment?.vat.toLocaleString()} SAR
                        </td>
                      </tr>
                    ) : null}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="text-right py-3 px-2 font-bold text-lg">
                        TOTAL AMOUNT:
                      </td>
                      <td className="text-right py-3 px-2 font-bold text-lg text-[#7A1516]">
                        {selectedPayment?.amount.toLocaleString()} SAR
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td><strong>Total Payment Amount:</strong></td>
                      <td className="text-right"><strong>{selectedPayment?.amount.toLocaleString()} SAR</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {selectedPayment?.notes ? (
              <div className="my-5">
                <h3>Notes:</h3>
                <p className="whitespace-pre-wrap">{selectedPayment?.notes}</p>
              </div>
            ) : null}

            {selectedPayment?.approvedByName ? (
              <div className="my-5 p-4 bg-green-50 border-l-4 border-green-500">
                <div><strong>Approved by:</strong> {selectedPayment?.approvedByName}</div>
                <div><strong>Approved on:</strong> {new Date(selectedPayment?.approvedDate).toLocaleString()}</div>
              </div>
            ) : null}

            {selectedPayment?.rejectedByName ? (
              <div className="my-5 p-4 bg-red-50 border-l-4 border-red-500">
                <div><strong>Rejected by:</strong> {selectedPayment?.rejectedByName}</div>
                <div><strong>Rejected on:</strong> {new Date(selectedPayment?.rejectedDate).toLocaleString()}</div>
                <div><strong>Reason:</strong> {selectedPayment?.rejectionReason}</div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRejectPayment} 
                className="bg-red-500 hover:bg-red-600"
                disabled={!rejectionReason.trim()}
              >
                Reject Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modification Request Dialog */}
      <Dialog open={modificationRequestDialogOpen} onOpenChange={setModificationRequestDialogOpen}>
        <DialogContent className="w-[98vw] max-w-[98vw] sm:max-w-[96vw] md:max-w-[94vw] lg:max-w-[92vw] xl:max-w-[90vw] 2xl:max-w-[88vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Request Modification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Payment Number</Label>
                <div className="font-mono font-semibold text-lg">{selectedPayment?.paymentNumber}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Payment Date</Label>
                <div className="font-mono font-semibold">{new Date(selectedPayment?.paymentDate).toLocaleDateString()}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Vendor</Label>
                <div className="font-semibold">{getVendorName(selectedPayment?.vendorId)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <div className="font-semibold">{getStatusBadge(selectedPayment?.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Related PO</Label>
                <div className="font-mono font-semibold">{getPONumber(selectedPayment?.poId)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Payment Method</Label>
                <div className="font-mono font-semibold">{selectedPayment?.paymentMethod.replace('_', ' ').toUpperCase()}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Reference Number</Label>
                <div className="font-mono font-semibold">{selectedPayment?.referenceNumber || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Created By</Label>
                <div className="font-mono font-semibold">{selectedPayment?.createdByName || 'Unknown'}</div>
              </div>
            </div>

            {selectedPayment?.lineItemPayments && selectedPayment?.lineItemPayments.length > 0 ? (
              <div>
                <h3>Line Item Breakdown</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Description</th>
                      <th className="text-center py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Unit Price</th>
                      <th className="text-right py-2 px-2">Line Total</th>
                      <th className="text-right py-2 px-2">Payment Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPayment?.lineItemPayments.map((item: any) => (
                      <tr key={item.description} className="border-b">
                        <td className="py-3 px-2">{item.description}</td>
                        <td className="text-center py-3 px-2">{item.quantity}</td>
                        <td className="text-right py-3 px-2">{item.unitPrice.toLocaleString()} SAR</td>
                        <td className="text-right py-3 px-2 font-medium">{item.lineTotal.toLocaleString()} SAR</td>
                        <td className="text-right py-3 px-2 font-bold text-green-600">
                          {item.paymentAmount.toLocaleString()} SAR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right py-3 px-2 font-semibold">
                        Subtotal:
                      </td>
                      <td className="text-right py-3 px-2 font-bold">
                        {(selectedPayment?.subtotal || selectedPayment?.amount).toLocaleString()} SAR
                      </td>
                    </tr>
                    {selectedPayment?.vat ? (
                      <tr>
                        <td colSpan={4} className="text-right py-3 px-2 font-semibold">
                          VAT (15%):
                        </td>
                        <td className="text-right py-3 px-2 font-bold">
                          {selectedPayment?.vat.toLocaleString()} SAR
                        </td>
                      </tr>
                    ) : null}
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="text-right py-3 px-2 font-bold text-lg">
                        TOTAL AMOUNT:
                      </td>
                      <td className="text-right py-3 px-2 font-bold text-lg text-[#7A1516]">
                        {selectedPayment?.amount.toLocaleString()} SAR
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td><strong>Total Payment Amount:</strong></td>
                      <td className="text-right"><strong>{selectedPayment?.amount.toLocaleString()} SAR</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {selectedPayment?.notes ? (
              <div className="my-5">
                <h3>Notes:</h3>
                <p className="whitespace-pre-wrap">{selectedPayment?.notes}</p>
              </div>
            ) : null}

            {selectedPayment?.approvedByName ? (
              <div className="my-5 p-4 bg-green-50 border-l-4 border-green-500">
                <div><strong>Approved by:</strong> {selectedPayment?.approvedByName}</div>
                <div><strong>Approved on:</strong> {new Date(selectedPayment?.approvedDate).toLocaleString()}</div>
              </div>
            ) : null}

            {selectedPayment?.rejectedByName ? (
              <div className="my-5 p-4 bg-red-50 border-l-4 border-red-500">
                <div><strong>Rejected by:</strong> {selectedPayment?.rejectedByName}</div>
                <div><strong>Rejected on:</strong> {new Date(selectedPayment?.rejectedDate).toLocaleString()}</div>
                <div><strong>Reason:</strong> {selectedPayment?.rejectionReason}</div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Modification Request Reason</Label>
              <Textarea
                value={modificationRequestReason}
                onChange={(e) => setModificationRequestReason(e.target.value)}
                placeholder="Enter modification request reason..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setModificationRequestDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRequestModification} 
                className="bg-yellow-500 hover:bg-yellow-600"
                disabled={!modificationRequestReason.trim()}
              >
                Request Modification
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}