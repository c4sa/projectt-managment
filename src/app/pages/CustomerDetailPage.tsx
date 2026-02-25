import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { dataStore } from '../data/store';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileCheck, Edit2, Save, X, FolderOpen, FileText, DollarSign, Receipt } from 'lucide-react';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [customerProjects, setCustomerProjects] = useState<any[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load customer data on mount
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        setLoading(true);
        const customerData = await dataStore.getCustomer(id!);
        setCustomer(customerData);
        setEditedCustomer(customerData);

        // Load related data
        const [allProjects, invoices, payments] = await Promise.all([
          dataStore.getProjects(),
          dataStore.getCustomerInvoices(id!),
          dataStore.getPayments()
        ]);

        setProjects(allProjects);
        setCustomerProjects(allProjects.filter(p => p.customerId === id));
        setCustomerInvoices(invoices);
        setCustomerPayments(payments.filter(p => p.customerId === id));
      } catch (error) {
        console.error('Error loading customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomerData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Customer Not Found</h2>
          <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
        </div>
      </div>
    );
  }

  // Calculate account statement totals
  const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = customerPayments.reduce((sum, pay) => sum + pay.amount, 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const handleSave = async () => {
    if (editedCustomer) {
      await dataStore.updateCustomer(id!, editedCustomer);
      setCustomer(editedCustomer);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedCustomer(customer);
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            {/* Customer Avatar */}
            <div className="w-16 h-16 bg-[#7A1516] text-white rounded-full flex items-center justify-center text-xl font-bold">
              {getInitials(customer.name)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              <p className="text-gray-500 font-mono">{customer.code}</p>
            </div>
          </div>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="bg-[#7A1516] hover:bg-[#5a0f10]">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Customer
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handleCancel} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Projects</p>
                <p className="font-semibold text-xl">{customerProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Invoices</p>
                <p className="font-semibold text-xl">{customerInvoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Invoiced</p>
                <p className="font-semibold text-lg">{totalInvoiced.toLocaleString()} SAR</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                totalOutstanding > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
              }`}>
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="font-semibold text-lg">{totalOutstanding.toLocaleString()} SAR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="statement">Account Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <Input
                        value={editedCustomer?.name || ''}
                        onChange={(e) => setEditedCustomer({ ...editedCustomer!, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Code</Label>
                      <Input
                        value={editedCustomer?.code || ''}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editedCustomer?.email || ''}
                        onChange={(e) => setEditedCustomer({ ...editedCustomer!, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editedCustomer?.phone || ''}
                        onChange={(e) => setEditedCustomer({ ...editedCustomer!, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contact Person</Label>
                      <Input
                        value={editedCustomer?.contactPerson || ''}
                        onChange={(e) => setEditedCustomer({ ...editedCustomer!, contactPerson: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>VAT Number</Label>
                      <Input
                        value={editedCustomer?.vatNumber || ''}
                        onChange={(e) => setEditedCustomer({ ...editedCustomer!, vatNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={editedCustomer?.address || ''}
                      onChange={(e) => setEditedCustomer({ ...editedCustomer!, address: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Customer Name</label>
                      <p className="text-lg font-semibold mt-1">{customer.name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Customer Code</label>
                      <p className="font-mono text-blue-600 text-lg mt-1">{customer.code}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Person</label>
                      <p className="mt-1">{customer.contactPerson || 'Not specified'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">VAT Number</label>
                      <p className="font-mono mt-1">{customer.vatNumber || 'Not specified'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                            {customer.email}
                          </a>
                        </div>
                      )}

                      {customer.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                            {customer.phone}
                          </a>
                        </div>
                      )}

                      {customer.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <p className="text-gray-700">{customer.address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {customerProjects.length > 0 ? (
                <div className="space-y-3">
                  {customerProjects.map((project) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{project.name}</h4>
                          <p className="text-sm text-gray-500 font-mono">{project.code}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Budget</p>
                            <p className="font-semibold">{project.budget.toLocaleString()} SAR</p>
                          </div>
                          <Badge className={
                            project.status === 'active' ? 'bg-green-100 text-green-700' :
                            project.status === 'planning' ? 'bg-yellow-100 text-yellow-700' :
                            project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No projects found for this customer</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {customerInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Invoice Number</th>
                        <th className="text-left p-3">Project</th>
                        <th className="text-left p-3">Issue Date</th>
                        <th className="text-left p-3">Due Date</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-left p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerInvoices.map((invoice) => {
                        const project = projects.find(p => p.id === invoice.projectId);
                        return (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-mono text-blue-600">{invoice.invoiceNumber}</td>
                            <td className="p-3">{project?.name || 'N/A'}</td>
                            <td className="p-3">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                            <td className="p-3">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                            <td className="p-3 text-right font-semibold">{invoice.total.toLocaleString()} SAR</td>
                            <td className="p-3">
                              <Badge className={
                                invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                invoice.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {invoice.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No invoices found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {customerPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Payment Number</th>
                        <th className="text-left p-3">Project</th>
                        <th className="text-left p-3">Payment Date</th>
                        <th className="text-left p-3">Method</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-left p-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerPayments.map((payment) => {
                        const project = projects.find(p => p.id === payment.projectId);
                        return (
                          <tr key={payment.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-mono text-blue-600">{payment.paymentNumber}</td>
                            <td className="p-3">{project?.name || 'N/A'}</td>
                            <td className="p-3">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td className="p-3 capitalize">{payment.paymentMethod.replace('_', ' ')}</td>
                            <td className="p-3 text-right font-semibold text-green-600">{payment.amount.toLocaleString()} SAR</td>
                            <td className="p-3 text-sm text-gray-500">{payment.referenceNumber || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No payments recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statement" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <p className="text-sm text-gray-600 mb-1">Total Invoiced</p>
                    <p className="text-2xl font-bold text-blue-600">{totalInvoiced.toLocaleString()} SAR</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-green-50">
                    <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} SAR</p>
                  </div>
                  <div className={`border rounded-lg p-4 ${totalOutstanding > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-600 mb-1">Outstanding Balance</p>
                    <p className={`text-2xl font-bold ${totalOutstanding > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {totalOutstanding.toLocaleString()} SAR
                    </p>
                  </div>
                </div>

                {/* Transaction History */}
                <div>
                  <h3 className="font-semibold mb-4">Transaction History</h3>
                  <div className="space-y-2">
                    {/* Combine invoices and payments, sort by date */}
                    {[
                      ...customerInvoices.map(inv => ({ type: 'invoice', date: inv.issueDate, amount: inv.total, ref: inv.invoiceNumber, data: inv })),
                      ...customerPayments.map(pay => ({ type: 'payment', date: pay.paymentDate, amount: pay.amount, ref: pay.paymentNumber, data: pay }))
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              item.type === 'invoice' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {item.type === 'invoice' ? <FileText className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-medium">{item.type === 'invoice' ? 'Invoice' : 'Payment'}</p>
                              <p className="text-sm text-gray-500 font-mono">{item.ref}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${item.type === 'invoice' ? 'text-blue-600' : 'text-green-600'}`}>
                              {item.type === 'invoice' ? '+' : '-'} {item.amount.toLocaleString()} SAR
                            </p>
                            <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    {customerInvoices.length === 0 && customerPayments.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No transactions found</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}