import { useState, useEffect } from 'react';
import { dataStore, BudgetCategory } from '../../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Plus, Eye, FileText, Calendar, DollarSign, Upload, X, Paperclip, Pencil, Trash2, Printer } from 'lucide-react';
import { VendorSelector } from '../../VendorSelector';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  projectId: string;
  onRequestPayment: (invoiceData: { vendorId: string; invoiceId: string; amount?: number }) => void;
}

export function VendorInvoiceTab({ projectId, onRequestPayment }: Props) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [newInvoice, setNewInvoice] = useState({
    vendorId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    description: '',
    vatTreatment: 'exclusive' as 'not_applicable' | 'inclusive' | 'exclusive',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0, budgetCategory: 'MEP' as BudgetCategory, budgetItem: '' }],
    notes: '',
    dueDate: '',
  });

  // Filter budget items to only show those with budgeted amount > 0 and valid item name
  const availableBudgetItems = budgetItems.filter((item: any) => 
    item.budgeted > 0 && item.name && item.name.trim() !== ''
  );

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    const invoicesData = await dataStore.getVendorInvoices();
    const projectInvoices = invoicesData.filter((inv: any) => inv.projectId === projectId);
    setInvoices(projectInvoices);
    
    const vendorsData = await dataStore.getVendors();
    setVendors(vendorsData);
    
    const usersData = await dataStore.getUsers();
    setUsers(usersData);
    
    const budgetData = await dataStore.getBudgetItems(projectId);
    setBudgetItems(budgetData);
  };

  const handleAddItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unitPrice: 0, total: 0, budgetCategory: 'MEP' as BudgetCategory, budgetItem: '' }],
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

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachedFiles([...attachedFiles, ...Array.from(files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const calculateSubtotal = () => {
    const itemsTotal = newInvoice.items.reduce((sum, item) => sum + item.total, 0);
    
    if (newInvoice.vatTreatment === 'inclusive') {
      // If VAT is inclusive, the items total already includes VAT
      // So we need to calculate the base amount (subtotal without VAT)
      return itemsTotal / 1.15;
    }
    
    return itemsTotal;
  };

  const calculateVAT = () => {
    if (newInvoice.vatTreatment === 'not_applicable') {
      return 0;
    }
    
    const itemsTotal = newInvoice.items.reduce((sum, item) => sum + item.total, 0);
    
    if (newInvoice.vatTreatment === 'inclusive') {
      // VAT is already included in the total, calculate it backwards
      return itemsTotal - (itemsTotal / 1.15);
    }
    
    // Exclusive: VAT is 15% of subtotal
    return calculateSubtotal() * 0.15;
  };

  const calculateTotal = () => {
    const itemsTotal = newInvoice.items.reduce((sum, item) => sum + item.total, 0);
    
    if (newInvoice.vatTreatment === 'not_applicable') {
      return itemsTotal;
    }
    
    if (newInvoice.vatTreatment === 'inclusive') {
      // Total is the same as items total when VAT is inclusive
      return itemsTotal;
    }
    
    // Exclusive: Add VAT to subtotal
    return calculateSubtotal() + calculateVAT();
  };

  const handleCreateInvoice = async () => {
    const invoice = {
      projectId,
      vendorId: newInvoice.vendorId,
      budgetCategory: newInvoice.items[0].budgetCategory,
      invoiceNumber: newInvoice.invoiceNumber,
      invoiceDate: newInvoice.invoiceDate,
      description: newInvoice.description,
      vatTreatment: newInvoice.vatTreatment,
      items: newInvoice.items,
      subtotal: calculateSubtotal(),
      vat: calculateVAT(),
      total: calculateTotal(),
      notes: newInvoice.notes,
      dueDate: newInvoice.dueDate,
      attachmentCount: attachedFiles.length,
      status: 'pending' as const,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    };

    await dataStore.addVendorInvoice(invoice);
    await loadData();
    setDialogOpen(false);
    setAttachedFiles([]);
    setNewInvoice({
      vendorId: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      description: '',
      vatTreatment: 'exclusive' as 'not_applicable' | 'inclusive' | 'exclusive',
      items: [{ description: '', quantity: 1, unitPrice: 0, total: 0, budgetCategory: 'MEP' as BudgetCategory, budgetItem: '' }],
      notes: '',
      dueDate: '',
    });
  };

  const handleEditInvoice = async () => {
    const invoice = {
      projectId,
      vendorId: newInvoice.vendorId,
      budgetCategory: newInvoice.items[0].budgetCategory,
      invoiceNumber: newInvoice.invoiceNumber,
      invoiceDate: newInvoice.invoiceDate,
      description: newInvoice.description,
      vatTreatment: newInvoice.vatTreatment,
      items: newInvoice.items,
      subtotal: calculateSubtotal(),
      vat: calculateVAT(),
      total: calculateTotal(),
      notes: newInvoice.notes,
      dueDate: newInvoice.dueDate,
      attachmentCount: attachedFiles.length,
      status: 'pending' as const,
    };

    await dataStore.updateVendorInvoice(editingInvoiceId!, invoice);
    await loadData();
    setDialogOpen(false);
    setAttachedFiles([]);
    setNewInvoice({
      vendorId: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      description: '',
      vatTreatment: 'exclusive' as 'not_applicable' | 'inclusive' | 'exclusive',
      items: [{ description: '', quantity: 1, unitPrice: 0, total: 0, budgetCategory: 'MEP' as BudgetCategory, budgetItem: '' }],
      notes: '',
      dueDate: '',
    });
    setEditMode(false);
    setEditingInvoiceId(null);
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.name : 'Unknown Vendor';
  };

  const getUserInfo = (userId: string | undefined) => {
    if (!userId) {
      // If no userId provided, check if it's the current user
      if (user?.id) {
        return `${user.name} (ID: ${user.id})`;
      }
      return 'Unknown User';
    }
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) {
      return `${foundUser.name} (ID: ${userId})`;
    }
    // If user not found in users array but matches current user
    if (user && user.id === userId) {
      return `${user.name} (ID: ${userId})`;
    }
    return `User ID: ${userId}`;
  };

  const getInvoiceCategories = (invoice: any) => {
    // Check if items have individual categories
    const hasItemCategories = invoice.items && invoice.items.some((item: any) => item.budgetCategory);
    
    if (hasItemCategories) {
      // Get unique categories from items
      const uniqueCategories = [...new Set(invoice.items.map((item: any) => item.budgetCategory).filter(Boolean))];
      
      if (uniqueCategories.length === 1) {
        return uniqueCategories[0];
      } else if (uniqueCategories.length > 1) {
        return 'Multiple';
      }
    }
    
    return invoice.budgetCategory || '-';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'pending_approval': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'paid': return 'Paid';
      default: return status;
    }
  };

  const handleSendForApproval = async () => {
    if (!selectedInvoice) return;
    
    await dataStore.updateVendorInvoice(selectedInvoice.id, {
      ...selectedInvoice,
      status: 'pending_approval',
      sentForApprovalDate: new Date().toISOString(),
      sentForApprovalBy: user?.id,
    });
    
    await loadData();
    setViewDialogOpen(false);
  };

  const handleApproveInvoice = async () => {
    if (!selectedInvoice) return;
    
    await dataStore.updateVendorInvoice(selectedInvoice.id, {
      ...selectedInvoice,
      status: 'approved',
      approvedDate: new Date().toISOString(),
      approvedBy: user?.id,
    });
    
    await loadData();
    setViewDialogOpen(false);
  };

  const handleRejectInvoice = async () => {
    if (!selectedInvoice) return;
    
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    await dataStore.updateVendorInvoice(selectedInvoice.id, {
      ...selectedInvoice,
      status: 'rejected',
      rejectedDate: new Date().toISOString(),
      rejectedBy: user?.id,
      rejectionReason: reason,
    });
    
    await loadData();
    setViewDialogOpen(false);
  };

  const handleRequestModification = async () => {
    if (!selectedInvoice) return;
    
    const reason = prompt('Please provide a reason for modification request:');
    if (!reason) return;
    
    await dataStore.updateVendorInvoice(selectedInvoice.id, {
      ...selectedInvoice,
      modificationRequestedDate: new Date().toISOString(),
      modificationRequestedBy: user?.id,
      modificationRequestReason: reason,
    });
    
    await loadData();
    setViewDialogOpen(false);
    alert('Modification request has been sent to the administrator.');
  };

  const handleRequestPayment = () => {
    if (selectedInvoice) {
      onRequestPayment({ vendorId: selectedInvoice.vendorId, invoiceId: selectedInvoice.id, amount: selectedInvoice.total });
      setViewDialogOpen(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const canSendForApproval = !isAdmin && selectedInvoice?.status === 'pending';
  const canApproveOrReject = isAdmin && (selectedInvoice?.status === 'pending' || selectedInvoice?.status === 'pending_approval');
  const canEdit = selectedInvoice?.status === 'pending' || (isAdmin && selectedInvoice?.status === 'approved');
  const isApproved = selectedInvoice?.status === 'approved';
  const canRequestPayment = selectedInvoice?.status && !['draft', 'pending', 'pending_approval', 'rejected', 'paid'].includes(selectedInvoice.status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_approval': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vendor Invoices</h3>
          <p className="text-sm text-gray-500">Manage vendor invoices for this project</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Vendor Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <VendorSelector
                    value={newInvoice.vendorId}
                    onChange={(value) => setNewInvoice({ ...newInvoice, vendorId: value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vendor Invoice Number *</Label>
                  <Input
                    value={newInvoice.invoiceNumber}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                    placeholder="Enter vendor invoice number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Invoice Date *</Label>
                  <Input
                    type="date"
                    value={newInvoice.invoiceDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                  placeholder="Enter invoice description"
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>VAT Treatment *</Label>
                <Select 
                  value={newInvoice.vatTreatment} 
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, vatTreatment: value as 'not_applicable' | 'inclusive' | 'exclusive' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive (VAT added on top)</SelectItem>
                    <SelectItem value="inclusive">Inclusive (VAT included in price)</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable (No VAT)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {newInvoice.vatTreatment === 'exclusive' && 'VAT will be calculated as 15% and added to the subtotal'}
                  {newInvoice.vatTreatment === 'inclusive' && 'VAT is already included in the item prices (15%)'}
                  {newInvoice.vatTreatment === 'not_applicable' && 'No VAT will be applied to this invoice'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {newInvoice.items.map((item, index) => (
                  <div key={index} className="space-y-2 p-4 border rounded-lg">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-6">
                        <Label className="text-xs">Description *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>
                      <div className="col-span-6">
                        <Label className="text-xs">Budget Item (Category - Item) *</Label>
                        <Select 
                          value={item.budgetItem} 
                          onValueChange={(value) => {
                            const selectedItem = availableBudgetItems.find(budgetItem => `${budgetItem.category}-${budgetItem.name}` === value);
                            if (selectedItem) {
                              handleItemChange(index, 'budgetItem', value);
                              handleItemChange(index, 'budgetCategory', selectedItem.category as BudgetCategory);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select budget item" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBudgetItems.map(budgetItem => (
                              <SelectItem 
                                key={`${budgetItem.category}-${budgetItem.name}`} 
                                value={`${budgetItem.category}-${budgetItem.name}`}
                              >
                                {budgetItem.category} - {budgetItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Unit Price (SAR)</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">Total (SAR)</Label>
                        <Input value={item.total.toFixed(2)} disabled className="bg-gray-50" />
                      </div>
                      {newInvoice.items.length > 1 && (
                        <div className="col-span-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700 w-full"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end space-y-2">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{calculateSubtotal().toFixed(2)} SAR</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>VAT (15%):</span>
                      <span>{calculateVAT().toFixed(2)} SAR</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{calculateTotal().toFixed(2)} SAR</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="border-2 border-dashed rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileAttachment}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload files</span>
                    <span className="text-xs text-gray-400 mt-1">PDF, Images, Word, Excel (Max 10MB each)</span>
                  </label>
                </div>

                {attachedFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={editMode ? handleEditInvoice : handleCreateInvoice} 
                  className="bg-[#7A1516] hover:bg-[#5A1012]"
                  disabled={!newInvoice.vendorId || !newInvoice.invoiceNumber || !newInvoice.description || newInvoice.items.some(i => !i.description)}
                >
                  {editMode ? 'Save Changes' : 'Create Invoice'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Invoices</div>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-blue-600">
              {invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()} SAR
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Pending Approval</div>
            <div className="text-2xl font-bold text-yellow-600">
              {invoices.filter(inv => inv.status === 'pending' || inv.status === 'draft').reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()} SAR
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {invoices.filter(inv => inv.status === 'pending' || inv.status === 'draft').length} invoices
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-600">
              {invoices.filter(inv => inv.status === 'approved' || inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()} SAR
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {invoices.filter(inv => inv.status === 'approved' || inv.status === 'paid').length} invoices
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Invoices List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Invoice Number</th>
                  <th className="text-left py-3 px-4">Vendor</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Due Date</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setViewDialogOpen(true);
                    }}
                  >
                    <td className="py-3 px-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4">{getVendorName(invoice.vendorId)}</td>
                    <td className="py-3 px-4">{invoice.description}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{getInvoiceCategories(invoice)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">
                      {invoice.total.toLocaleString()} SAR
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice);
                            setViewDialogOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(invoice.status === 'pending' || (isAdmin && invoice.status === 'approved')) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewDialogOpen(false);
                              setEditMode(true);
                              setEditingInvoiceId(invoice.id);
                              setSelectedInvoice(invoice);
                              
                              setNewInvoice({
                                vendorId: invoice.vendorId,
                                invoiceNumber: invoice.invoiceNumber,
                                invoiceDate: invoice.invoiceDate,
                                description: invoice.description,
                                vatTreatment: invoice.vatTreatment || 'exclusive',
                                items: invoice.items,
                                notes: invoice.notes,
                                dueDate: invoice.dueDate,
                              });
                              setAttachedFiles([]);
                              setDialogOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit Invoice"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('PDF export functionality coming soon!');
                          }}
                          className="text-green-600 hover:text-green-700"
                          title="Print/Export PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        {(invoice.status === 'pending' || isAdmin) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
                                await dataStore.deleteVendorInvoice(invoice.id);
                                await loadData();
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      No invoices yet. Create your first invoice!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Vendor Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[98vw] sm:max-w-[98vw] md:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendor Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-[#7A1516] to-[#5A1012] text-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Vendor Invoice Number</p>
                    <p className="text-3xl font-bold font-mono mt-1">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Status</p>
                    <span className={`inline-block mt-1 px-4 py-2 rounded ${getStatusColor(selectedInvoice.status)} text-sm font-semibold`}>
                      {getStatusLabel(selectedInvoice.status).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor & Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500 text-sm">Vendor</Label>
                    <p className="text-lg font-semibold">{getVendorName(selectedInvoice.vendorId)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Budget Category</Label>
                    <p className="text-base">
                      <span className="bg-gray-100 px-3 py-1 rounded">{getInvoiceCategories(selectedInvoice)}</span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Invoice Date</Label>
                    <p className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500 text-sm">Due Date</Label>
                    <p className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">VAT Treatment</Label>
                    <p className="text-base font-medium">
                      {selectedInvoice.vatTreatment === 'not_applicable' && 'Not Applicable'}
                      {selectedInvoice.vatTreatment === 'inclusive' && 'VAT Inclusive'}
                      {selectedInvoice.vatTreatment === 'exclusive' && 'VAT Exclusive'}
                    </p>
                  </div>
                  {selectedInvoice.attachmentCount > 0 && (
                    <div>
                      <Label className="text-gray-500 text-sm">Attachments</Label>
                      <p className="text-base flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        {selectedInvoice.attachmentCount} file(s) attached
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-gray-500 text-sm">Description</Label>
                <p className="text-base mt-1">{selectedInvoice.description}</p>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h4 className="font-semibold">Line Items</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">#</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Description</th>
                        {selectedInvoice.items.some((item: any) => item.budgetCategory) && (
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                        )}
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Unit Price</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="py-3 px-4">{item.description}</td>
                          {selectedInvoice.items.some((item: any) => item.budgetCategory) && (
                            <td className="py-3 px-4">
                              {item.budgetCategory && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.budgetCategory}</span>
                              )}
                            </td>
                          )}
                          <td className="text-right py-3 px-4">{item.quantity}</td>
                          <td className="text-right py-3 px-4">{item.unitPrice.toFixed(2)} SAR</td>
                          <td className="text-right py-3 px-4 font-semibold">{item.total.toFixed(2)} SAR</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex justify-end">
                  <div className="w-80 space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">{selectedInvoice.subtotal.toFixed(2)} SAR</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">VAT (15%):</span>
                      <span className="font-semibold">{selectedInvoice.vat.toFixed(2)} SAR</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-xl">
                      <span className="font-bold">Total Amount:</span>
                      <span className="font-bold text-[#7A1516]">{selectedInvoice.total.toFixed(2)} SAR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <Label className="text-gray-700 font-semibold">Notes</Label>
                  <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}

              {/* Audit Logs */}
              <div className="border-t pt-6">
                <Label className="text-gray-700 font-semibold text-lg">Audit Trail</Label>
                <div className="mt-4 space-y-3">
                  {/* Created */}
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Vendor Invoice Created</p>
                      <p className="text-xs text-gray-600 mt-1">
                        by {getUserInfo(selectedInvoice.createdBy)} • {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Sent for Approval */}
                  {selectedInvoice.sentForApprovalDate && (
                    <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sent for Approval</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedInvoice.sentForApprovalBy)} • {new Date(selectedInvoice.sentForApprovalDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Approved */}
                  {selectedInvoice.approvedDate && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Vendor Invoice Approved</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedInvoice.approvedBy)} • {new Date(selectedInvoice.approvedDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rejected */}
                  {selectedInvoice.rejectedDate && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Vendor Invoice Rejected</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedInvoice.rejectedBy)} • {new Date(selectedInvoice.rejectedDate).toLocaleString()}
                        </p>
                        {selectedInvoice.rejectionReason && (
                          <p className="text-sm text-red-700 mt-2 italic">Reason: {selectedInvoice.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Modification Request */}
                  {selectedInvoice.modificationRequestedDate && (
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Modification Requested</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedInvoice.modificationRequestedBy)} • {new Date(selectedInvoice.modificationRequestedDate).toLocaleString()}
                        </p>
                        {selectedInvoice.modificationRequestReason && (
                          <p className="text-sm text-purple-700 mt-2 italic">Reason: {selectedInvoice.modificationRequestReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setViewDialogOpen(false)}
                  type="button"
                >
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  onClick={() => {
                    alert('PDF export functionality coming soon!');
                  }}
                  type="button"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                {canSendForApproval && (
                  <Button 
                    className="bg-[#7A1516] hover:bg-[#5A1012] text-white"
                    onClick={handleSendForApproval}
                    type="button"
                  >
                    Send for Approval
                  </Button>
                )}
                {canApproveOrReject && (
                  <>
                    <Button 
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={handleApproveInvoice}
                      type="button"
                    >
                      Approve Invoice
                    </Button>
                    <Button 
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={handleRejectInvoice}
                      type="button"
                    >
                      Reject Invoice
                    </Button>
                  </>
                )}
                {canEdit && (
                  <Button 
                    className="bg-[#7A1516] hover:bg-[#5A1012] text-white"
                    onClick={() => {
                      setViewDialogOpen(false);
                      setEditMode(true);
                      setEditingInvoiceId(selectedInvoice.id);
                      
                      setNewInvoice({
                        vendorId: selectedInvoice.vendorId,
                        invoiceNumber: selectedInvoice.invoiceNumber,
                        invoiceDate: selectedInvoice.invoiceDate,
                        description: selectedInvoice.description,
                        vatTreatment: selectedInvoice.vatTreatment || 'exclusive',
                        items: selectedInvoice.items,
                        notes: selectedInvoice.notes,
                        dueDate: selectedInvoice.dueDate,
                      });
                      setAttachedFiles([]);
                      setDialogOpen(true);
                    }}
                    type="button"
                  >
                    Edit Invoice
                  </Button>
                )}
                {isApproved && !isAdmin && (
                  <Button 
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={handleRequestModification}
                    type="button"
                  >
                    Request Modification
                  </Button>
                )}
                {canRequestPayment && (
                  <Button 
                    className="bg-[#7A1516] hover:bg-[#5A1012] text-white"
                    onClick={handleRequestPayment}
                    type="button"
                  >
                    Request Payment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}