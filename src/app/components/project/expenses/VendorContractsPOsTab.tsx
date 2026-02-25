import React, { useState, useEffect } from 'react';
import { dataStore, BudgetCategory, POStatus } from '../../../data/store';
import { useAuth } from '../../../contexts/AuthContext';
import { numberGenerator } from '../../../utils/numberGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Plus, Eye, FileText, Calendar, DollarSign, Upload, X, CheckCircle, XCircle, Send, Pencil, Trash2, Printer } from 'lucide-react';
import { VendorSelector } from '../../VendorSelector';

interface Props {
  projectId: string;
  onRequestPayment: (poData: { vendorId: string; poId: string; amount?: number }) => void;
}

export function VendorContractsPOsTab({ projectId, onRequestPayment }: Props) {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingPOId, setEditingPOId] = useState<string | null>(null);
  const [generatedPONumber, setGeneratedPONumber] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [differentCategoryPerItem, setDifferentCategoryPerItem] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newPO, setNewPO] = useState({
    vendorId: '',
    budgetCategory: '' as BudgetCategory,
    budgetItem: '',
    description: '',
    items: [{ description: '', unit: 'pcs', quantity: 1, unitPrice: 0, total: 0, budgetCategory: '' as BudgetCategory, budgetItem: '' }],
    vatStatus: 'exclusive' as 'not_applicable' | 'inclusive' | 'exclusive',
    paymentTerms: '',
    termsAndConditions: '',
    notes: '',
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // Filter budget items to only show those with budgeted amount > 0 and valid item name
  const availableBudgetItems = budgetItems.filter((item: any) => 
    item.budgeted > 0 && item.name && item.name.trim() !== ''
  );

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Generate PO number when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      const poNumber = numberGenerator.previewNextNumber('purchaseOrder');
      setGeneratedPONumber(poNumber);
    }
  }, [dialogOpen]);

  const loadData = async () => {
    console.log('Loading PO data...');
    const pos = await dataStore.getPurchaseOrders(projectId);
    console.log('Loaded POs:', pos.length, 'items');
    setPurchaseOrders(pos);
    
    const vendorsData = await dataStore.getVendors();
    setVendors(vendorsData);

    const usersData = await dataStore.getUsers();
    setUsers(usersData);

    const budgetData = await dataStore.getBudgetItems(projectId);
    setBudgetItems(budgetData);

    const invoicesData = await dataStore.getVendorInvoices();
    const projectInvoices = invoicesData.filter((inv: any) => inv.projectId === projectId);
    setInvoices(projectInvoices);

    const paymentsData = await dataStore.getPayments(projectId);
    setPayments(paymentsData);
  };

  const handleAddItem = () => {
    setNewPO({
      ...newPO,
      items: [...newPO.items, { description: '', unit: 'pcs', quantity: 1, unitPrice: 0, total: 0, budgetCategory: '' as BudgetCategory, budgetItem: '' }],
    });
  };

  const handleRemoveItem = (index: number) => {
    const items = newPO.items.filter((_, i) => i !== index);
    setNewPO({ ...newPO, items });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const items = [...newPO.items];
    items[index] = { ...items[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].total = items[index].quantity * items[index].unitPrice;
    }
    
    setNewPO({ ...newPO, items });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return newPO.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateVAT = () => {
    const subtotal = calculateSubtotal();
    
    if (newPO.vatStatus === 'not_applicable') {
      return 0;
    } else if (newPO.vatStatus === 'inclusive') {
      // If VAT is inclusive, extract the VAT from total
      // Total = Subtotal + VAT, where VAT = Subtotal * 0.15
      // So Subtotal = Total / 1.15
      // VAT = Total - Subtotal
      const valueWithoutVAT = subtotal / 1.15;
      return subtotal - valueWithoutVAT;
    } else if (newPO.vatStatus === 'exclusive') {
      return subtotal * 0.15;
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const vat = calculateVAT();
    
    if (newPO.vatStatus === 'inclusive') {
      // If VAT is inclusive, the subtotal already contains VAT
      return subtotal;
    } else if (newPO.vatStatus === 'exclusive') {
      return subtotal + vat;
    } else {
      // not_applicable
      return subtotal;
    }
  };

  const getDisplaySubtotal = () => {
    const subtotal = calculateSubtotal();
    if (newPO.vatStatus === 'inclusive') {
      // Show the actual value without VAT
      return subtotal / 1.15;
    }
    return subtotal;
  };

  const handleCreatePO = async () => {
    const po = {
      projectId,
      vendorId: newPO.vendorId,
      budgetCategory: newPO.budgetCategory,
      description: newPO.description,
      items: newPO.items,
      vatStatus: newPO.vatStatus,
      subtotal: getDisplaySubtotal(),
      vat: calculateVAT(),
      total: calculateTotal(),
      paymentTerms: newPO.paymentTerms,
      termsAndConditions: newPO.termsAndConditions,
      notes: newPO.notes,
      documents: uploadedFiles.map(f => f.name), // In production, upload to storage first
      status: 'draft' as const,
      createdBy: user?.id, // Track who created the PO
    };

    await dataStore.addPurchaseOrder(po);
    await loadData();
    setDialogOpen(false);
    setNewPO({
      vendorId: '',
      budgetCategory: '' as BudgetCategory,
      budgetItem: '',
      description: '',
      items: [{ description: '', unit: 'pcs', quantity: 1, unitPrice: 0, total: 0, budgetCategory: '' as BudgetCategory, budgetItem: '' }],
      vatStatus: 'exclusive',
      paymentTerms: '',
      termsAndConditions: '',
      notes: '',
    });
    setUploadedFiles([]);
  };

  const handleEditPO = async () => {
    const po = {
      projectId,
      vendorId: newPO.vendorId,
      budgetCategory: newPO.budgetCategory,
      description: newPO.description,
      items: newPO.items,
      vatStatus: newPO.vatStatus,
      subtotal: getDisplaySubtotal(),
      vat: calculateVAT(),
      total: calculateTotal(),
      paymentTerms: newPO.paymentTerms,
      termsAndConditions: newPO.termsAndConditions,
      notes: newPO.notes,
      documents: uploadedFiles.map(f => f.name), // In production, upload to storage first
      status: 'draft' as const,
      modifiedBy: user?.id, // Track who modified the PO
      modifiedAt: new Date().toISOString(),
    };

    await dataStore.updatePurchaseOrder(editingPOId!, po);
    await loadData();
    setDialogOpen(false);
    setNewPO({
      vendorId: '',
      budgetCategory: '' as BudgetCategory,
      budgetItem: '',
      description: '',
      items: [{ description: '', unit: 'pcs', quantity: 1, unitPrice: 0, total: 0, budgetCategory: '' as BudgetCategory, budgetItem: '' }],
      vatStatus: 'exclusive',
      paymentTerms: '',
      termsAndConditions: '',
      notes: '',
    });
    setUploadedFiles([]);
    setEditMode(false);
    setEditingPOId(null);
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

  const getPOCategories = (po: any) => {
    // Check if items have individual categories
    const hasItemCategories = po.items && po.items.some((item: any) => item.budgetCategory);
    
    if (hasItemCategories) {
      // Get unique categories from items
      const uniqueCategories = [...new Set(po.items.map((item: any) => item.budgetCategory).filter(Boolean))];
      
      if (uniqueCategories.length === 1) {
        return uniqueCategories[0];
      } else if (uniqueCategories.length > 1) {
        return 'Multiple';
      }
    }
    
    // Fallback to PO-level category
    return po.budgetCategory || 'N/A';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'issued': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'Pending Approval';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleSendForApproval = async () => {
    if (!selectedPO) return;
    await dataStore.updatePurchaseOrder(selectedPO.id, { status: 'pending_approval' as POStatus });
    await loadData();
    setViewDialogOpen(false);
  };

  const handleApprovePO = async () => {
    if (!selectedPO) return;
    
    // Update budget reserved
    await dataStore.updateBudgetReserved(selectedPO.projectId, selectedPO, true);
    
    // Update PO status
    await dataStore.updatePurchaseOrder(selectedPO.id, { 
      status: 'approved' as POStatus,
      approvedBy: user?.id,
      approvedDate: new Date().toISOString(),
    });
    
    await loadData();
    setViewDialogOpen(false);
  };

  const handleRejectPO = async () => {
    if (!selectedPO) return;
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      await dataStore.updatePurchaseOrder(selectedPO.id, { 
        status: 'rejected' as POStatus,
        rejectedBy: user?.id,
        rejectedDate: new Date().toISOString(),
        rejectionReason: reason,
      });
      await loadData();
      setViewDialogOpen(false);
    }
  };

  const handleRequestModification = async () => {
    if (!selectedPO) return;
    const reason = prompt('Please explain what modifications you need:');
    if (reason) {
      await dataStore.updatePurchaseOrder(selectedPO.id, { 
        modificationRequestedBy: user?.id,
        modificationRequestedDate: new Date().toISOString(),
        modificationRequestReason: reason,
      });
      await loadData();
      setViewDialogOpen(false);
      alert('Modification request submitted to admin.');
    }
  };

  const handleRequestPayment = () => {
    // Navigate to payment request with PO info
    if (selectedPO) {
      onRequestPayment({ vendorId: selectedPO.vendorId, poId: selectedPO.id, amount: selectedPO.total });
    }
    setViewDialogOpen(false);
  };

  const handlePrintPO = (po: any) => {
    // TODO: Implement PDF export
    alert('PDF export functionality coming soon!');
  };

  const isAdmin = user?.role === 'admin';
  const canSendForApproval = selectedPO?.status === 'draft';
  const canApproveOrReject = isAdmin && selectedPO?.status === 'pending_approval';
  const canEdit = selectedPO?.status === 'draft' || (isAdmin && selectedPO?.status === 'approved');
  const isApproved = selectedPO?.status === 'approved';
  const canRequestPayment = selectedPO?.status && !['draft', 'pending_approval', 'rejected', 'paid'].includes(selectedPO.status);

  // Calculate PO statistics
  const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  
  // Total invoiced: Sum of all approved vendor invoices linked to any PO in this project
  const totalInvoiced = invoices
    .filter(inv => inv.poId && (inv.status === 'approved' || inv.status === 'paid'))
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  
  // Total paid: Sum of all PAID payments linked to POs
  const totalPaid = payments
    .filter(p => p.poId && p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Outstanding: Total PO Value - Total Paid
  const outstanding = totalPOValue - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vendor Contracts & Purchase Orders</h3>
          <p className="text-sm text-gray-500">Manage vendor contracts and purchase orders for this project</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* PO Number Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Purchase Order Number</p>
                    <p className="text-2xl font-bold text-[#7A1516] font-mono">{editMode ? selectedPO?.poNumber : generatedPONumber}</p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <VendorSelector
                    value={newPO.vendorId}
                    onChange={(value) => setNewPO({ ...newPO, vendorId: value })}
                  />
                </div>

                {!differentCategoryPerItem && (
                  <div className="space-y-2">
                    <Label>Budget Item (Category - Item) *</Label>
                    <Select 
                      value={newPO.budgetItem} 
                      onValueChange={(value) => {
                        const selectedItem = availableBudgetItems.find(item => `${item.category}-${item.name}` === value);
                        if (selectedItem) {
                          setNewPO({ ...newPO, budgetItem: value, budgetCategory: selectedItem.category as BudgetCategory });
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
                )}
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={newPO.description}
                  onChange={(e) => setNewPO({ ...newPO, description: e.target.value })}
                  placeholder="Enter PO description"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label>Items</Label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={differentCategoryPerItem}
                        onChange={(e) => setDifferentCategoryPerItem(e.target.checked)}
                        className="w-4 h-4 text-[#7A1516] border-gray-300 rounded focus:ring-[#7A1516]"
                      />
                      <span className="text-sm text-gray-600">Different budget category per line item</span>
                    </label>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {newPO.items.map((item, index) => (
                  <div key={index} className={`grid ${differentCategoryPerItem ? 'grid-cols-27' : 'grid-cols-27'} gap-2 items-end`}>
                    <div className={differentCategoryPerItem ? 'col-span-6' : 'col-span-10'}>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    {differentCategoryPerItem && (
                      <div className="col-span-4">
                        <Label className="text-xs">Budget Item</Label>
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
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select item" />
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
                    )}
                    <div className="col-span-4">
                      <Label className="text-xs">Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="Unit"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Total</Label>
                      <Input value={item.total.toFixed(2)} disabled className="bg-gray-100" />
                    </div>
                    {newPO.items.length > 1 && (
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700 h-10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
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
                <Label>VAT Status</Label>
                <Select value={newPO.vatStatus} onValueChange={(value) => setNewPO({ ...newPO, vatStatus: value as 'not_applicable' | 'inclusive' | 'exclusive' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                    <SelectItem value="inclusive">Inclusive</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Textarea
                  value={newPO.paymentTerms}
                  onChange={(e) => setNewPO({ ...newPO, paymentTerms: e.target.value })}
                  placeholder="Payment terms..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Terms and Conditions</Label>
                <Textarea
                  value={newPO.termsAndConditions}
                  onChange={(e) => setNewPO({ ...newPO, termsAndConditions: e.target.value })}
                  placeholder="Terms and conditions..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newPO.notes}
                  onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Documents</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="upload-documents"
                  />
                  <label
                    htmlFor="upload-documents"
                    className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Upload
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-2">
                    <ul className="list-disc pl-5">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-sm">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                {editMode ? (
                  <Button 
                    onClick={handleEditPO} 
                    className="bg-[#7A1516] hover:bg-[#5A1012]"
                    disabled={!newPO.vendorId || !newPO.description || newPO.items.some(i => !i.description)}
                  >
                    Update PO
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCreatePO} 
                    className="bg-[#7A1516] hover:bg-[#5A1012]"
                    disabled={!newPO.vendorId || !newPO.description || newPO.items.some(i => !i.description)}
                  >
                    Create PO
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total PO Value</div>
            <div className="text-2xl font-bold text-blue-600">
              {totalPOValue.toLocaleString()} SAR
            </div>
            <div className="text-xs text-gray-500 mt-1">{purchaseOrders.length} POs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Invoiced</div>
            <div className="text-2xl font-bold text-purple-600">
              {totalInvoiced.toLocaleString()} SAR
            </div>
            <div className="text-xs text-gray-500 mt-1">Invoices against POs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">
              {totalPaid.toLocaleString()} SAR
            </div>
            <div className="text-xs text-gray-500 mt-1">Paid payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1">Outstanding</div>
            <div className="text-2xl font-bold text-orange-600">
              {outstanding.toLocaleString()} SAR
            </div>
            <div className="text-xs text-gray-500 mt-1">PO Value - Paid</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">PO Number</th>
                  <th className="text-left py-3 px-4">Vendor</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr 
                    key={po.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedPO(po);
                      setViewDialogOpen(true);
                    }}
                  >
                    <td className="py-3 px-4 font-mono text-sm">{po.poNumber}</td>
                    <td className="py-3 px-4">{getVendorName(po.vendorId)}</td>
                    <td className="py-3 px-4">{po.description}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{getPOCategories(po)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(po.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold">
                      {po.total.toLocaleString()} SAR
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(po.status)}`}>
                        {getStatusLabel(po.status)}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPO(po);
                            setViewDialogOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(po.status === 'draft' || (isAdmin && po.status === 'approved')) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewDialogOpen(false);
                              setEditMode(true);
                              setEditingPOId(po.id);
                              setSelectedPO(po);
                              
                              // Check if PO has different categories per item
                              const hasDifferentCategories = po.items && po.items.some((item: any) => item.budgetCategory);
                              setDifferentCategoryPerItem(hasDifferentCategories);
                              
                              setNewPO({
                                vendorId: po.vendorId,
                                budgetCategory: po.budgetCategory,
                                budgetItem: po.budgetItem || '',
                                description: po.description,
                                items: po.items,
                                vatStatus: po.vatStatus,
                                paymentTerms: po.paymentTerms || '',
                                termsAndConditions: po.termsAndConditions || '',
                                notes: po.notes || '',
                              });
                              setUploadedFiles([]);
                              setDialogOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit PO"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintPO(po);
                          }}
                          className="text-green-600 hover:text-green-700"
                          title="Print/Export PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        {(po.status === 'draft' || isAdmin) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              console.log('Delete button clicked for PO:', po.id, po.poNumber);
                              const confirmed = confirm(`Are you sure you want to delete PO ${po.poNumber}? This action cannot be undone.`);
                              console.log('User confirmed deletion:', confirmed);
                              if (confirmed) {
                                try {
                                  console.log('Calling deletePurchaseOrder...');
                                  await dataStore.deletePurchaseOrder(po.id);
                                  console.log('Delete completed, reloading data...');
                                  await loadData();
                                  console.log('Data reloaded successfully');
                                } catch (error) {
                                  console.error('Error deleting PO:', error);
                                  alert('Failed to delete PO. Please check console for details.');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Delete PO"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No purchase orders yet. Create your first PO!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Purchase Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[98vw] sm:max-w-[98vw] md:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] w-full max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-6 py-4">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-[#7A1516] to-[#5A1012] text-white rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Purchase Order Number</p>
                    <p className="text-3xl font-bold font-mono mt-1">{selectedPO.poNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Status</p>
                    <span className={`inline-block mt-1 px-4 py-2 rounded ${getStatusColor(selectedPO.status)} text-sm font-semibold`} >
                      {selectedPO.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vendor & Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500 text-sm">Vendor</Label>
                    <p className="text-lg font-semibold">{getVendorName(selectedPO.vendorId)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">Budget Category</Label>
                    <p className="text-base">
                      <span className="bg-gray-100 px-3 py-1 rounded">{getPOCategories(selectedPO)}</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-500 text-sm">Date Created</Label>
                    <p className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(selectedPO.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-sm">VAT Status</Label>
                    <p className="text-base font-medium">
                      {selectedPO.vatStatus === 'not_applicable' && 'Not Applicable'}
                      {selectedPO.vatStatus === 'inclusive' && 'VAT Inclusive'}
                      {selectedPO.vatStatus === 'exclusive' && 'VAT Exclusive'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-500 text-sm">Description</Label>
                <p className="text-base mt-1">{selectedPO.description}</p>
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
                        {selectedPO.items.some((item: any) => item.budgetCategory) && (
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                        )}
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Unit</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Unit Price</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="py-3 px-4">{item.description}</td>
                          {selectedPO.items.some((item: any) => item.budgetCategory) && (
                            <td className="py-3 px-4">
                              {item.budgetCategory && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.budgetCategory}</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 text-sm">{item.unit}</td>
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
                      <span className="font-semibold">{selectedPO.subtotal.toFixed(2)} SAR</span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">VAT (15%):</span>
                      <span className="font-semibold">{selectedPO.vat.toFixed(2)} SAR</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-xl">
                      <span className="font-bold">Total Amount:</span>
                      <span className="font-bold text-[#7A1516]">{selectedPO.total.toFixed(2)} SAR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Terms & T&C */}
              {selectedPO.paymentTerms && (
                <div>
                  <Label className="text-gray-700 font-semibold">Payment Terms</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedPO.paymentTerms}
                  </div>
                </div>
              )}

              {selectedPO.termsAndConditions && (
                <div>
                  <Label className="text-gray-700 font-semibold">Terms and Conditions</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedPO.termsAndConditions}
                  </div>
                </div>
              )}

              {selectedPO.notes && (
                <div>
                  <Label className="text-gray-700 font-semibold">Notes</Label>
                  <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedPO.notes}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedPO.documents && selectedPO.documents.length > 0 && (
                <div>
                  <Label className="text-gray-700 font-semibold">Attached Documents</Label>
                  <div className="mt-2 space-y-2">
                    {selectedPO.documents.map((doc: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">{doc}</span>
                      </div>
                    ))}
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
                      <p className="text-sm font-medium">Purchase Order Created</p>
                      <p className="text-xs text-gray-600 mt-1">
                        by {getUserInfo(selectedPO.createdBy)} • {new Date(selectedPO.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Modified */}
                  {selectedPO.modifiedAt && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Purchase Order Modified</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedPO.modifiedBy)} • {new Date(selectedPO.modifiedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Approved */}
                  {selectedPO.approvedDate && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Purchase Order Approved</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedPO.approvedBy)} • {new Date(selectedPO.approvedDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rejected */}
                  {selectedPO.rejectedDate && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Purchase Order Rejected</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedPO.rejectedBy)} • {new Date(selectedPO.rejectedDate).toLocaleString()}
                        </p>
                        {selectedPO.rejectionReason && (
                          <p className="text-sm text-red-700 mt-2 italic">Reason: {selectedPO.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Modification Request */}
                  {selectedPO.modificationRequestedDate && (
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Modification Requested</p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {getUserInfo(selectedPO.modificationRequestedBy)} • {new Date(selectedPO.modificationRequestedDate).toLocaleString()}
                        </p>
                        {selectedPO.modificationRequestReason && (
                          <p className="text-sm text-purple-700 mt-2 italic">Reason: {selectedPO.modificationRequestReason}</p>
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
                    // TODO: Implement PDF export
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
                      onClick={handleApprovePO}
                      type="button"
                    >
                      Approve PO
                    </Button>
                    <Button 
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={handleRejectPO}
                      type="button"
                    >
                      Reject PO
                    </Button>
                  </>
                )}
                {canEdit && (
                  <Button 
                    className="bg-[#7A1516] hover:bg-[#5A1012] text-white"
                    onClick={() => {
                      // TODO: Implement edit functionality
                      setViewDialogOpen(false);
                      setEditMode(true);
                      setEditingPOId(selectedPO.id);
                      
                      // Check if PO has different categories per item
                      const hasDifferentCategories = selectedPO.items && selectedPO.items.some((item: any) => item.budgetCategory);
                      setDifferentCategoryPerItem(hasDifferentCategories);
                      
                      setNewPO({
                        vendorId: selectedPO.vendorId,
                        budgetCategory: selectedPO.budgetCategory,
                        description: selectedPO.description,
                        items: selectedPO.items,
                        vatStatus: selectedPO.vatStatus,
                        paymentTerms: selectedPO.paymentTerms,
                        termsAndConditions: selectedPO.termsAndConditions,
                        notes: selectedPO.notes,
                      });
                      setUploadedFiles([]);
                      setDialogOpen(true);
                    }}
                    type="button"
                  >
                    Edit PO
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
                {isApproved && !isAdmin && (
                  <Button 
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={handleRequestModification}
                    type="button"
                  >
                    Request Modification
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