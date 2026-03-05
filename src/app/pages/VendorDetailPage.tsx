import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { dataStore, Vendor, PurchaseOrder, VendorInvoice, Payment } from '../data/store';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  ShoppingCart,
  Receipt,
  Wallet,
  Edit,
  Save,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissionsMatrix } from '../contexts/PermissionsMatrixContext';
import { AccessDenied } from '../components/AccessDenied';
import { useLanguage } from '../contexts/LanguageContext';

export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { hasPermission } = usePermissionsMatrix();
  const canView = hasPermission('vendors', 'view');
  const canEdit = hasPermission('vendors', 'edit');
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedVendor, setEditedVendor] = useState<Partial<Vendor>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [vendors, allPOs, allInvoices, allPayments] = await Promise.all([
          dataStore.getVendors(),
          dataStore.getPurchaseOrders(),
          dataStore.getVendorInvoices(),
          dataStore.getPayments(),
        ]);

        const foundVendor = vendors.find(v => v.id === id) || null;
        setVendor(foundVendor);
        setEditedVendor(foundVendor || {});
        setPurchaseOrders(allPOs.filter(po => po.vendorId === id));
        setInvoices(allInvoices.filter(inv => inv.vendorId === id));
        setPayments(allPayments.filter(p => p.vendorId === id));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleUpdateVendor = async () => {
    if (!id || !editedVendor) return;

    await dataStore.updateVendor(id, editedVendor);

    const vendors = await dataStore.getVendors();
    const updatedVendor = vendors.find(v => v.id === id);
    setVendor(updatedVendor || null);

    setEditDialogOpen(false);
    toast.success(t('vendor.updatedSuccess'));
  };

  if (!canView) {
    return <AccessDenied message={t('vendor.accessDenied')} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#7A1516] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('vendor.loading')}</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Vendor not found</p>
          <Button onClick={() => navigate('/vendors')} className="mt-4">
            Back to Vendors
          </Button>
        </div>
      </div>
    );
  }

  const totalPOAmount = purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0);
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaidAmount = payments
    .filter(p => p.status === 'approved' || p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const outstandingAmount = totalInvoiceAmount - totalPaidAmount;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
      case 'received':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'pending_approval':
      case 'draft':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/vendors')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{vendor.name}</h1>
              {vendor.specialty && (
                <p className="text-gray-500 mt-1">{vendor.specialty}</p>
              )}
            </div>
          </div>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          {canEdit && (
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Edit className="w-4 h-4 mr-2" />
              {t('vendor.edit')}
            </Button>
          </DialogTrigger>
          )}
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('vendor.edit')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vendors.vendorName')}</Label>
                  <Input
                    value={editedVendor.name || ''}
                    onChange={(e) => setEditedVendor({ ...editedVendor, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('vendors.contactPerson')}</Label>
                  <Input
                    value={editedVendor.contactPerson || ''}
                    onChange={(e) => setEditedVendor({ ...editedVendor, contactPerson: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.email')}</Label>
                  <Input
                    type="email"
                    value={editedVendor.email || ''}
                    onChange={(e) => setEditedVendor({ ...editedVendor, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.phone')}</Label>
                  <Input
                    value={editedVendor.phone || ''}
                    onChange={(e) => setEditedVendor({ ...editedVendor, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('vendors.iban')}</Label>
                  <Input
                    value={editedVendor.iban || ''}
                    onChange={(e) => setEditedVendor({ ...editedVendor, iban: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('vendors.vatNumber')}</Label>
                  <Input
                    value={editedVendor.vatNumber || ''}
                    onChange={(e) => setEditedVendor({ ...editedVendor, vatNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specialty</Label>
                <Input
                  value={editedVendor.specialty || ''}
                  onChange={(e) => setEditedVendor({ ...editedVendor, specialty: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('common.address')}</Label>
                <Input
                  value={editedVendor.address || ''}
                  onChange={(e) => setEditedVendor({ ...editedVendor, address: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                {canEdit && (
                <Button onClick={handleUpdateVendor} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.saveChanges')}
                </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('vendor.totalPurchaseOrders')}</p>
                <p className="text-2xl font-bold mt-1">{purchaseOrders.length}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              SAR {totalPOAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('vendor.totalInvoices')}</p>
                <p className="text-2xl font-bold mt-1">{invoices.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              SAR {totalInvoiceAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('vendor.totalPaid')}</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  SAR {totalPaidAmount.toLocaleString()}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {payments.filter(p => p.status === 'approved' || p.status === 'paid').length} {t('vendor.paymentsCount')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('vendor.outstanding')}</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  SAR {outstandingAmount.toLocaleString()}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {invoices.filter(inv => inv.status !== 'paid').length} {t('vendor.unpaidInvoices')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Info className="w-4 h-4 mr-2" />
            {t('vendor.overview')}
          </TabsTrigger>
          <TabsTrigger value="purchase-orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t('vendor.purchaseOrders')} ({purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="w-4 h-4 mr-2" />
            {t('vendor.invoices')} ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Wallet className="w-4 h-4 mr-2" />
            {t('vendor.payments')} ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('vendor.vendorInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">{t('vendor.companyName')}</p>
                    <p className="font-medium">{vendor.name}</p>
                  </div>
                </div>

                {vendor.contactPerson && (
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t('vendors.contactPerson')}</p>
                      <p className="font-medium">{vendor.contactPerson}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">{t('common.email')}</p>
                    <p className="font-medium">{vendor.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">{t('common.phone')}</p>
                    <p className="font-medium">{vendor.phone}</p>
                  </div>
                </div>

                {vendor.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{vendor.address}</p>
                    </div>
                  </div>
                )}

                {vendor.specialty && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t('common.specialty')}</p>
                      <p className="font-medium">{vendor.specialty}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('vendor.financialInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendor.iban && (
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t('vendors.iban')}</p>
                      <p className="font-medium font-mono text-sm">{vendor.iban}</p>
                    </div>
                  </div>
                )}

                {vendor.vatNumber && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">{t('vendors.vatNumber')}</p>
                      <p className="font-medium font-mono">{vendor.vatNumber}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('vendor.totalOrdersValue')}</span>
                    <span className="font-semibold">SAR {totalPOAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('vendor.totalInvoiced')}</span>
                    <span className="font-semibold">SAR {totalInvoiceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('vendor.totalPaid')}</span>
                    <span className="font-semibold text-green-600">SAR {totalPaidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">{t('vendor.outstandingBalance')}</span>
                    <span className="font-bold text-red-600">SAR {outstandingAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader>
              <CardTitle>{t('vendor.purchaseOrders')}</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('vendor.noPurchaseOrders')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchaseOrders.map((po) => (
                    <div key={po.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">{po.poNumber}</p>
                          <Badge className={getStatusColor(po.status)}>
                            {po.status}
                          </Badge>
                        </div>
                        {po.notes && <p className="text-sm text-gray-500 mt-1">{po.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(po.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">SAR {(po.total || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{t('vendor.totalAmount')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>{t('vendor.vendorInvoices')}</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('vendor.noInvoices')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Issued: {new Date(invoice.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">SAR {(invoice.total || 0).toLocaleString()}</p>
                        {invoice.vatAmount > 0 && (
                          <p className="text-sm text-gray-500">VAT: SAR {(invoice.vatAmount || 0).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>{t('vendor.paymentHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('vendor.noPayments')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">{payment.paymentNumber || `Payment #${payment.id.slice(0, 8)}`}</p>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                        {payment.notes && <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">SAR {(payment.amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{payment.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
