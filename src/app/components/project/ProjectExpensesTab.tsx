import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import type { Project } from '../../data/store';
import { VendorContractsPOsTab } from './expenses/VendorContractsPOsTab';
import { VendorInvoiceTab } from './expenses/VendorInvoiceTab';
import { VendorPaymentTab } from './expenses/VendorPaymentTab';
import { usePermissionsMatrix } from '../../contexts/PermissionsMatrixContext';

interface Props {
  projectId: string;
  project?: Project;
}

export function ProjectExpensesTab({ projectId, project }: Props) {
  const { hasPermission } = usePermissionsMatrix();
  const canViewPOs = hasPermission('purchase_orders', 'view');
  const canViewInvoices = hasPermission('vendor_invoices', 'view');
  const canViewPayments = hasPermission('payments', 'view');
  const visibleSubTabs = [canViewPOs && 'contracts', canViewInvoices && 'invoices', canViewPayments && 'payments'].filter(Boolean) as string[];
  const defaultTab = visibleSubTabs[0] || 'contracts';
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (!visibleSubTabs.includes(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [visibleSubTabs.join(','), activeTab, defaultTab]);
  const [prefilledPaymentData, setPrefilledPaymentData] = useState<{
    vendorId: string;
    poId?: string;
    invoiceId?: string;
    amount?: number;
  } | null>(null);

  const handleRequestPayment = (paymentData: { vendorId: string; poId?: string; invoiceId?: string; amount?: number }) => {
    setPrefilledPaymentData(paymentData);
    if (canViewPayments) setActiveTab('payments');
    else setActiveTab(defaultTab);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Project Expenses</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={visibleSubTabs.length === 3 ? 'grid w-full grid-cols-3' : 'flex flex-wrap gap-1'}>
          {canViewPOs && <TabsTrigger value="contracts">Vendor Contract/POs</TabsTrigger>}
          {canViewInvoices && <TabsTrigger value="invoices">Vendor Invoice</TabsTrigger>}
          {canViewPayments && <TabsTrigger value="payments">Vendor Payment/Progress Invoice</TabsTrigger>}
        </TabsList>

        {canViewPOs && (
        <TabsContent value="contracts" className="mt-6">
          <VendorContractsPOsTab projectId={projectId} onRequestPayment={handleRequestPayment} />
        </TabsContent>
        )}

        {canViewInvoices && (
        <TabsContent value="invoices" className="mt-6">
          <VendorInvoiceTab projectId={projectId} onRequestPayment={handleRequestPayment} />
        </TabsContent>
        )}

        {canViewPayments && (
        <TabsContent value="payments" className="mt-6">
          <VendorPaymentTab 
            projectId={projectId} 
            prefilledData={prefilledPaymentData}
            onDataUsed={() => setPrefilledPaymentData(null)}
          />
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}