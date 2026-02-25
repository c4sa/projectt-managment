import React, { useState, useEffect } from 'react';
import { dataStore, BudgetItem, BudgetCategory } from '../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, TrendingUp, TrendingDown, Info, Pencil, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  projectId: string;
}

// Helper component for tooltips
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <Info className="w-4 h-4 text-gray-400 cursor-help inline" />
    <div className="invisible group-hover:visible absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg -left-2 top-6">
      {text}
    </div>
  </div>
);

export function ProjectBudgetTab({ projectId }: Props) {
  const [budgetItems, setBudgetItems] = useState(dataStore.getBudgetItems(projectId));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [variationOrders, setVariationOrders] = useState<any[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [newItem, setNewItem] = useState({
    category: 'Fitout' as BudgetCategory,
    name: '',
    budgeted: 0,
    actual: 0,
  });

  const [categories, setCategories] = useState<string[]>([]);

  // Load financial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to get POs from API, fallback to sync method which uses localStorage
        let pos;
        try {
          pos = await dataStore.getPurchaseOrders(projectId);
        } catch (error) {
          console.log('Using local PO data');
          pos = dataStore.getPurchaseOrdersSync(projectId);
        }
        setPurchaseOrders(pos);
        
        const paymentsData = dataStore.getPayments(projectId);
        setPayments(paymentsData);
        
        const vos = dataStore.getVariationOrders();
        const projectVOs = vos.filter((vo: any) => {
          const po = pos.find((p: any) => p.id === vo.poId);
          return po && po.projectId === projectId;
        });
        setVariationOrders(projectVOs);
        
        // Try to get invoices from API, fallback to sync method which uses localStorage
        let invoices;
        try {
          invoices = await dataStore.getVendorInvoices();
        } catch (error) {
          console.log('Using local invoice data');
          invoices = dataStore.getVendorInvoicesSync();
        }
        const projectInvoices = invoices.filter((inv: any) => inv.projectId === projectId);
        setVendorInvoices(projectInvoices);
        
        // Also refresh budget items
        setBudgetItems(dataStore.getBudgetItems(projectId));
      } catch (error) {
        console.error('Error loading budget data:', error);
      }
    };
    
    loadData();
    // Load budget categories
    const cats = dataStore.getBudgetCategories();
    setCategories(cats);
    // Set default category to first available
    if (cats.length > 0) {
      setNewItem(prev => ({ ...prev, category: cats[0] as BudgetCategory }));
    }
  }, [projectId]);

  // Add visibility change listener to refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setRefreshTrigger(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate reserved amount (committed) based on POs, VOs, and Invoices for specific budget item
  const calculateReservedForItem = (budgetItem: BudgetItem) => {
    let total = 0;
    const budgetItemKey = `${budgetItem.category}-${budgetItem.name}`;
    
    // Debug logging
    console.log(`Calculating reserved for: ${budgetItemKey}`);
    console.log(`Total POs: ${purchaseOrders.length}`);
    console.log(`Total Invoices: ${vendorInvoices.length}`);
    console.log(`Total VOs: ${variationOrders.length}`);
    
    // Count APPROVED, PARTIALLY_PAID, or PAID Purchase Orders (all represent approved/committed funds)
    purchaseOrders.forEach((po: any) => {
      if (po.status !== 'approved' && po.status !== 'partially_paid' && po.status !== 'paid') return; // Skip non-approved POs
      
      console.log(`Checking PO ${po.poNumber}, status: ${po.status}, budgetItem: ${po.budgetItem}`);
      
      // Check if PO has line items with different categories
      const hasLineItemCategories = po.items && po.items.some((item: any) => item.budgetItem);
      
      if (hasLineItemCategories) {
        // Sum line items that match this specific budget item
        po.items.forEach((item: any) => {
          console.log(`  Line item budgetItem: ${item.budgetItem}, total: ${item.total}`);
          if (item.budgetItem === budgetItemKey) {
            total += item.total;
            console.log(`  ✓ Matched! Added ${item.total}, new total: ${total}`);
          }
        });
      } else if (po.budgetItem === budgetItemKey) {
        // Use PO-level budget item and subtotal (before VAT)
        total += po.subtotal || 0;
        console.log(`  ✓ PO-level match! Added ${po.subtotal}, new total: ${total}`);
      }
    });
    
    // Count APPROVED, PARTIALLY_PAID, or PAID invoices (all represent approved/committed funds)
    const itemInvoices = vendorInvoices.filter((inv: any) => 
      inv.budgetItem === budgetItemKey && 
      (inv.status === 'approved' || inv.status === 'partially_paid' || inv.status === 'paid')
    );
    console.log(`Found ${itemInvoices.length} matching invoices`);
    itemInvoices.forEach((inv: any) => {
      // For invoices with line items, sum only matching items
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item: any) => {
          if (item.budgetItem === budgetItemKey) {
            total += item.total || 0;
          }
        });
      } else {
        // For invoices without line items, use subtotal
        total += inv.subtotal || 0;
      }
    });
    
    // Sum approved VOs with this specific budget item
    const itemVOs = variationOrders.filter((vo: any) => vo.budgetItem === budgetItemKey && vo.status === 'approved');
    console.log(`Found ${itemVOs.length} matching VOs`);
    itemVOs.forEach((vo: any) => {
      total += vo.totalAmount;
    });
    
    console.log(`Final reserved total for ${budgetItemKey}: ${total}`);
    return total;
  };

  // Calculate actual spent amount based on PAID payments for specific budget item
  const calculateActualSpentForItem = (budgetItem: BudgetItem) => {
    let total = 0;
    const budgetItemKey = `${budgetItem.category}-${budgetItem.name}`;
    
    // Only count payments with status 'paid'
    const paidPayments = payments.filter((p: any) => p.type === 'payment' && p.status === 'paid');
    
    // Sum payments for POs with this specific budget item
    purchaseOrders.forEach((po: any) => {
      // Check if PO has line items with different budget items
      const hasLineItemBudgetItems = po.items && po.items.some((item: any) => item.budgetItem);
      
      if (hasLineItemBudgetItems) {
        // Get payments for this PO and sum based on line item budget items
        const poPayments = paidPayments.filter((p: any) => p.poId === po.id);
        poPayments.forEach((payment: any) => {
          if (payment.lineItemPayments) {
            payment.lineItemPayments.forEach((linePayment: any, index: number) => {
              const poItem = po.items[index];
              if (poItem && (poItem.budgetItem === budgetItemKey || (!poItem.budgetItem && po.budgetItem === budgetItemKey))) {
                total += linePayment.paymentAmount || 0;
              }
            });
          }
        });
      } else if (po.budgetItem === budgetItemKey) {
        // Use PO-level budget item
        const poPayments = paidPayments.filter((p: any) => p.poId === po.id);
        const poPaymentTotal = poPayments.reduce((sum: number, p: any) => sum + (p.subtotal || p.amount), 0);
        total += poPaymentTotal;
      }
    });
    
    // Sum payments for invoices with this specific budget item
    const itemInvoices = vendorInvoices.filter((inv: any) => inv.budgetItem === budgetItemKey);
    itemInvoices.forEach((inv: any) => {
      const invPayments = paidPayments.filter((p: any) => p.invoiceId === inv.id);
      const invPaymentTotal = invPayments.reduce((sum: number, p: any) => sum + (p.subtotal || p.amount), 0);
      total += invPaymentTotal;
    });
    
    return total;
  };

  const handleCreateItem = () => {
    dataStore.addBudgetItem({
      projectId,
      category: newItem.category,
      name: newItem.name,
      budgeted: newItem.budgeted,
      reserved: 0,
      actual: 0,
    });
    setBudgetItems(dataStore.getBudgetItems(projectId));
    setDialogOpen(false);
    setNewItem({
      category: 'Fitout',
      name: '',
      budgeted: 0,
      actual: 0,
    });
  };

  const handleEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (editingItem) {
      dataStore.updateBudgetItem(editingItem.id, {
        category: editingItem.category,
        name: editingItem.name,
        budgeted: editingItem.budgeted,
      });
      setBudgetItems(dataStore.getBudgetItems(projectId));
      setEditDialogOpen(false);
    }
  };

  const handleDeleteItem = (item: BudgetItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        dataStore.deleteBudgetItem(item.id);
        setBudgetItems(dataStore.getBudgetItems(projectId));
      } catch (error: any) {
        alert(error.message || 'Failed to delete budget item');
      }
    }
  };

  // Calculate totals with reserved and actual spent amounts
  const budgetItemsWithCalculations = budgetItems.map((item) => {
    const reserved = calculateReservedForItem(item);
    const actualSpent = calculateActualSpentForItem(item);
    return { ...item, reserved, actualSpent };
  });

  const totalBudgeted = budgetItemsWithCalculations.reduce((sum, item) => sum + item.budgeted, 0);
  const totalReserved = budgetItemsWithCalculations.reduce((sum, item) => sum + item.reserved, 0);
  const totalActualSpent = budgetItemsWithCalculations.reduce((sum, item) => sum + item.actualSpent, 0);
  const variance = totalBudgeted - totalReserved;
  const utilizationPercent = totalBudgeted > 0 ? (totalReserved / totalBudgeted) * 100 : 0;

  // Group by category for chart
  const categoryData = categories.map(cat => {
    const items = budgetItemsWithCalculations.filter(item => item.category === cat);
    return {
      category: cat,
      budgeted: items.reduce((sum, item) => sum + item.budgeted, 0),
      reserved: items.reduce((sum, item) => sum + item.reserved, 0),
      actualSpent: items.reduce((sum, item) => sum + item.actualSpent, 0),
    };
  }).filter(d => d.budgeted > 0 || d.reserved > 0 || d.actualSpent > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Note: All amounts (Budget, Reserved, Remaining, and Actual Spent) are VAT exclusive
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Add Budget Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value as BudgetCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., Foundation Work, Electrical Installation, HVAC System"
                />
                <p className="text-xs text-gray-500">
                  Provide a descriptive name for this budget item
                </p>
              </div>

              <div className="space-y-2">
                <Label>Budgeted Amount (SAR) *</Label>
                <Input
                  type="number"
                  value={newItem.budgeted}
                  onChange={(e) => setNewItem({ ...newItem, budgeted: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateItem} 
                  className="bg-[#7A1516] hover:bg-[#5A1012]"
                  disabled={!newItem.name.trim() || newItem.budgeted <= 0}
                >
                  Add Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Budget Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editingItem?.category} onValueChange={(value) => setEditingItem({ ...editingItem!, category: value as BudgetCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  value={editingItem?.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem!, name: e.target.value })}
                  placeholder="e.g., Foundation Work, Electrical Installation, HVAC System"
                />
                <p className="text-xs text-gray-500">
                  Provide a descriptive name for this budget item
                </p>
              </div>

              <div className="space-y-2">
                <Label>Budgeted Amount (SAR) *</Label>
                <Input
                  type="number"
                  value={editingItem?.budgeted || 0}
                  onChange={(e) => setEditingItem({ ...editingItem!, budgeted: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateItem} 
                  className="bg-[#7A1516] hover:bg-[#5A1012]"
                  disabled={!editingItem?.name?.trim() || (editingItem?.budgeted || 0) <= 0}
                >
                  Update Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1 flex items-center">
              Total Budgeted
              <InfoTooltip text="The estimated amount planned for a specific expense, category, or project, usually established at the start of a period." />
            </div>
            <div className="text-2xl font-bold">{totalBudgeted.toLocaleString()} SAR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1 flex items-center">
              Total Reserved
              <InfoTooltip text="Funds that are 'earmarked' or set aside for planned expenses that have not yet been fully invoiced or paid." />
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalReserved.toLocaleString()} SAR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1 flex items-center">
              Total Actual Spent
              <InfoTooltip text="The true amount of money already paid out for goods or services." />
            </div>
            <div className="text-2xl font-bold text-green-600">{totalActualSpent.toLocaleString()} SAR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1 flex items-center">
              Outstanding Commitment
              <InfoTooltip text="Amount committed to vendors but not yet paid (Reserved - Actual Spent)." />
            </div>
            <div className="text-2xl font-bold text-orange-600">{(totalReserved - totalActualSpent).toLocaleString()} SAR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-500 mb-1 flex items-center">
              Remaining Budget
              <InfoTooltip text="The amount of money left over from the original budget after accounting for both actual, realized expenses and reserved funds." />
            </div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {variance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {Math.abs(variance).toLocaleString()} SAR
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => `${((value as number) || 0).toLocaleString()} SAR`} />
                <Legend />
                <Bar dataKey="budgeted" fill="#7A1516" name="Budgeted" />
                <Bar dataKey="reserved" fill="#3b82f6" name="Reserved" />
                <Bar dataKey="actualSpent" fill="#16a34a" name="Actual Spent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Budget Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Item</th>
                  <th className="text-right py-3 px-4">
                    <span className="inline-flex items-center">
                      Budgeted
                      <InfoTooltip text="The estimated amount planned for a specific expense, category, or project, usually established at the start of a period." />
                    </span>
                  </th>
                  <th className="text-right py-3 px-4">
                    <span className="inline-flex items-center">
                      Reserved
                      <InfoTooltip text="Funds that are 'earmarked' or set aside for planned expenses that have not yet been fully invoiced or paid." />
                    </span>
                  </th>
                  <th className="text-right py-3 px-4">
                    <span className="inline-flex items-center">
                      Actual Spent
                      <InfoTooltip text="The true amount of money already paid out for goods or services." />
                    </span>
                  </th>
                  <th className="text-right py-3 px-4">
                    <span className="inline-flex items-center">
                      Remaining
                      <InfoTooltip text="The amount of money left over from the original budget after accounting for both actual, realized expenses and reserved funds." />
                    </span>
                  </th>
                  <th className="text-right py-3 px-4">%</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgetItemsWithCalculations.map((item) => {
                  const itemVariance = item.budgeted - item.reserved;
                  const itemPercent = item.budgeted > 0 ? (item.reserved / item.budgeted) * 100 : 0;
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{item.category}</td>
                      <td className="py-3 px-4">{item.name}</td>
                      <td className="text-right py-3 px-4">{item.budgeted.toLocaleString()} SAR</td>
                      <td className="text-right py-3 px-4">{item.reserved.toLocaleString()} SAR</td>
                      <td className="text-right py-3 px-4">{item.actualSpent.toLocaleString()} SAR</td>
                      <td className={`text-right py-3 px-4 ${itemVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {itemVariance.toLocaleString()} SAR
                      </td>
                      <td className="text-right py-3 px-4">{itemPercent.toFixed(1)}%</td>
                      <td className="text-right py-3 px-4">
                        <Button
                          className="bg-[#7A1516] hover:bg-[#5A1012] mr-2"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          className="bg-red-500 hover:bg-red-600"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {budgetItemsWithCalculations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No budget items yet. Add your first item!
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