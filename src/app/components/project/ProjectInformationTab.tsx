import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { dataStore, Project } from '../../data/store';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Building2, Mail, Phone, MapPin, FileCheck, FileText, ExternalLink, Edit2, Save, X, Upload, Link as LinkIcon, DollarSign, TrendingUp } from 'lucide-react';

interface ProjectInformationTabProps {
  project: Project;
}

export function ProjectInformationTab({ project }: ProjectInformationTabProps) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState(project);
  const [totalInvoiced, setTotalInvoiced] = useState(0);
  const [totalPaidByCustomer, setTotalPaidByCustomer] = useState(0);

  // Load customer data
  useEffect(() => {
    const loadCustomer = async () => {
      if (project.customerId) {
        try {
          const customerData = await dataStore.getCustomer(project.customerId);
          setCustomer(customerData);
        } catch (error) {
          // Customer not found or error loading - gracefully handle
          console.log('Customer data not available for this project');
          setCustomer(null);
        }
      }
    };
    loadCustomer();
  }, [project.customerId]);

  // Calculate total invoiced and paid by customer
  useEffect(() => {
    const calculateCustomerFinancials = async () => {
      // Get all customer invoices for this project
      const allInvoices = await dataStore.getCustomerInvoices();
      const projectInvoices = allInvoices.filter((invoice: any) => invoice.projectId === project.id);
      
      // Calculate total invoiced (all invoices that are sent or approved, not just drafts)
      const invoiced = projectInvoices
        .filter((invoice: any) => invoice.status !== 'draft')
        .reduce((sum: number, invoice: any) => sum + (invoice.total || 0), 0);
      
      // Calculate total paid by customer - use ACTUAL payments received (not invoice status)
      const allPayments = await dataStore.getPayments(project.id);
      const customerPayments = allPayments.filter((payment: any) => payment.type === 'receipt' && payment.status === 'paid');
      const paid = customerPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
      
      setTotalInvoiced(invoiced);
      setTotalPaidByCustomer(paid);
    };

    calculateCustomerFinancials();
  }, [project.id]);

  // Calculate contract value breakdown
  const calculateContractBreakdown = (proj: typeof project) => {
    if (!proj.contractValue) return null;
    
    const contractValue = proj.contractValue;
    const VAT_RATE = 0.15;

    if (proj.vatStatus === 'not_applicable') {
      return {
        total: contractValue,
        subtotal: contractValue,
        vatAmount: 0,
        label: 'Not Applicable'
      };
    } else if (proj.vatStatus === 'inclusive') {
      const valueWithoutVAT = contractValue / 1.15;
      const vatAmount = contractValue - valueWithoutVAT;
      return {
        total: contractValue,
        subtotal: valueWithoutVAT,
        vatAmount: vatAmount,
        label: 'VAT Inclusive'
      };
    } else if (proj.vatStatus === 'exclusive') {
      const vatAmount = contractValue * VAT_RATE;
      const total = contractValue + vatAmount;
      return {
        total: total,
        subtotal: contractValue,
        vatAmount: vatAmount,
        label: 'VAT Exclusive'
      };
    }
    return null;
  };

  const contractBreakdown = calculateContractBreakdown(isEditing ? editedProject : project);

  const handleSave = () => {
    dataStore.updateProject(project.id, editedProject);
    setIsEditing(false);
    // Refresh parent component by navigating to the same route
    window.location.href = window.location.href;
  };

  const handleCancel = () => {
    setEditedProject(project);
    setIsEditing(false);
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Edit Button */}
      <div className="flex justify-end">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="bg-[#7A1516] hover:bg-[#5a0f10]">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Project Information
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details Card */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => customer && navigate(`/customers/${customer.id}`)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#7A1516]" />
              Customer Details
              <span className="text-sm text-gray-500 ml-auto">(Click to view full details)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="w-12 h-12 bg-[#7A1516] text-white rounded-full flex items-center justify-center text-lg font-bold">
                    {getInitials(customer.name)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{customer.name}</p>
                    <p className="font-mono text-blue-600 text-sm">{customer.code}</p>
                  </div>
                </div>

                {customer.contactPerson && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contact Person</label>
                    <p className="mt-1">{customer.contactPerson}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-2 border-t">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {customer.email}
                      </a>
                    </div>
                  )}

                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {customer.phone}
                      </a>
                    </div>
                  )}

                  {customer.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <p className="text-gray-700">{customer.address}</p>
                    </div>
                  )}

                  {customer.vatNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">VAT: </span>
                      <span className="font-mono">{customer.vatNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No customer assigned to this project</p>
            )}
          </CardContent>
        </Card>

        {/* Contract Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#7A1516]" />
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Contract Value (SAR)</Label>
                  <Input
                    type="number"
                    value={editedProject.contractValue || 0}
                    onChange={(e) => setEditedProject({ ...editedProject, contractValue: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>VAT Status</Label>
                  <Select
                    value={editedProject.vatStatus || 'not_applicable'}
                    onValueChange={(value: any) => setEditedProject({ ...editedProject, vatStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_applicable">VAT Not Applicable</SelectItem>
                      <SelectItem value="inclusive">VAT Inclusive</SelectItem>
                      <SelectItem value="exclusive">VAT Exclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* VAT Breakdown Preview */}
                {contractBreakdown && editedProject.contractValue && editedProject.contractValue > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">Financial Breakdown Preview</h4>
                    
                    {editedProject.vatStatus === 'not_applicable' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total</span>
                        <span className="font-semibold">{contractBreakdown.total.toLocaleString('en-SA')} SAR</span>
                      </div>
                    )}

                    {editedProject.vatStatus === 'inclusive' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Contract Value</span>
                          <span className="font-semibold">{editedProject.contractValue.toLocaleString('en-SA')} SAR</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-gray-600">Value Without VAT</span>
                          <span className="font-semibold text-green-600">{contractBreakdown.subtotal.toFixed(2)} SAR</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">VAT Amount (15%)</span>
                          <span className="font-semibold text-gray-500">{contractBreakdown.vatAmount.toFixed(2)} SAR</span>
                        </div>
                      </>
                    )}

                    {editedProject.vatStatus === 'exclusive' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Contract Value</span>
                          <span className="font-semibold">{contractBreakdown.subtotal.toLocaleString('en-SA')} SAR</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">VAT (15%)</span>
                          <span className="font-semibold text-gray-500">+ {contractBreakdown.vatAmount.toLocaleString('en-SA')} SAR</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-gray-600">Total (Incl. VAT)</span>
                          <span className="font-semibold text-green-600">{contractBreakdown.total.toLocaleString('en-SA')} SAR</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="mb-2 block">Contract Document</Label>
                  {editedProject.contractDocument && editedProject.contractDocument.startsWith('data:') ? (
                    <div className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded border border-green-200 mb-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="flex-1 text-green-700">Document uploaded</span>
                      <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:text-red-700"
                        onClick={() => setEditedProject({ ...editedProject, contractDocument: '' })}>
                        Remove
                      </Button>
                    </div>
                  ) : null}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="w-4 h-4 mr-2" />
                      {editedProject.contractDocument && editedProject.contractDocument.startsWith('data:') ? 'Replace Document' : 'Upload Document'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return; }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setEditedProject({ ...editedProject, contractDocument: ev.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX. Max 10MB</p>
                </div>

                <div>
                  <Label className="mb-2 block">Cloud Storage Link</Label>
                  <Input
                    placeholder="https://cloudstorage.com/contract.pdf"
                    value={editedProject.contractLink || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, contractLink: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
                {project.contractValue ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contract Value</label>
                      <p className="text-2xl font-bold text-[#7A1516] mt-1">
                        {project.contractValue.toLocaleString('en-SA')} SAR
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">VAT Status</label>
                      <div className="mt-1">
                        <Badge className="bg-blue-100 text-blue-700">
                          {contractBreakdown?.label || 'Not Specified'}
                        </Badge>
                      </div>
                    </div>

                    {/* VAT Breakdown */}
                    {contractBreakdown && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                        <h4 className="font-medium text-sm">Financial Breakdown</h4>
                        
                        {project.vatStatus === 'not_applicable' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total</span>
                            <span className="font-semibold">{contractBreakdown.total.toLocaleString('en-SA')} SAR</span>
                          </div>
                        )}

                        {project.vatStatus === 'inclusive' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Contract Value</span>
                              <span className="font-semibold">{project.contractValue.toLocaleString('en-SA')} SAR</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-gray-600">Value Without VAT</span>
                              <span className="font-semibold text-green-600">{contractBreakdown.subtotal.toFixed(2)} SAR</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">VAT Amount (15%)</span>
                              <span className="font-semibold text-gray-500">{contractBreakdown.vatAmount.toFixed(2)} SAR</span>
                            </div>
                          </>
                        )}

                        {project.vatStatus === 'exclusive' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Contract Value</span>
                              <span className="font-semibold">{contractBreakdown.subtotal.toLocaleString('en-SA')} SAR</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">VAT (15%)</span>
                              <span className="font-semibold text-gray-500">+ {contractBreakdown.vatAmount.toLocaleString('en-SA')} SAR</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                              <span className="text-gray-600">Total (Incl. VAT)</span>
                              <span className="font-semibold text-green-600">{contractBreakdown.total.toLocaleString('en-SA')} SAR</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Contract Documents */}
                    {(project.contractDocument || project.contractLink) && (
                      <div className="pt-4 border-t">
                        <label className="text-sm font-medium text-gray-500 block mb-2">Contract Documents</label>
                        <div className="space-y-2">
                          {project.contractDocument && (
                            <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded border">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="flex-1 text-gray-700 truncate">
                                {project.contractDocument.startsWith('data:') ? 'Contract Document (Uploaded)' : project.contractDocument.split('/').pop()}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={() => {
                                  if (project.contractDocument!.startsWith('data:')) {
                                    const win = window.open();
                                    if (win) { win.document.write(`<iframe src="${project.contractDocument}" style="width:100%;height:100%;border:none;"></iframe>`); }
                                  } else {
                                    window.open(project.contractDocument, '_blank');
                                  }
                                }}
                              >
                                View
                              </Button>
                            </div>
                          )}
                          {project.contractLink && (
                            <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded border">
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                              <a 
                                href={project.contractLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 text-blue-600 hover:underline truncate"
                              >
                                {project.contractLink}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No contract details available</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Project Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input
                      value={editedProject.name}
                      onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={editedProject.location || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editedProject.status}
                      onValueChange={(value: any) => setEditedProject({ ...editedProject, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={editedProject.startDate}
                      onChange={(e) => setEditedProject({ ...editedProject, startDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={editedProject.endDate || ''}
                      onChange={(e) => setEditedProject({ ...editedProject, endDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Budget (SAR)</Label>
                    <Input
                      type="number"
                      value={editedProject.budget}
                      onChange={(e) => setEditedProject({ ...editedProject, budget: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editedProject.description || ''}
                    onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1">{project.location || 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Start Date</label>
                  <p className="mt-1">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not specified'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">End Date</label>
                  <p className="mt-1">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not specified'}</p>
                </div>

                {project.description && (
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-gray-700">{project.description}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#7A1516]" />
              Revenue & Collection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Total Invoiced to Customer</label>
                <p className="text-2xl font-bold text-[#7A1516]">{totalInvoiced.toLocaleString('en-SA')} SAR</p>
                <p className="text-xs text-gray-500">Sum of all approved and paid claims</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Total Paid by Customer</label>
                <p className="text-2xl font-bold text-green-600">{totalPaidByCustomer.toLocaleString('en-SA')} SAR</p>
                <p className="text-xs text-gray-500">Sum of all paid claims</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Outstanding Receivables</label>
                <p className="text-2xl font-bold text-orange-600">{(totalInvoiced - totalPaidByCustomer).toLocaleString('en-SA')} SAR</p>
                <p className="text-xs text-gray-500">Invoiced but not yet collected</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Collection Rate</label>
                <p className="text-2xl font-bold text-blue-600">
                  {totalInvoiced > 0 ? ((totalPaidByCustomer / totalInvoiced) * 100).toFixed(1) : '0.0'}%
                </p>
                <p className="text-xs text-gray-500">Payment collection efficiency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}