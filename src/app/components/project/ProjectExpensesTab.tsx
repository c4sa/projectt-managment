import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { VendorContractsPOsTab } from './expenses/VendorContractsPOsTab';
import { VendorInvoiceTab } from './expenses/VendorInvoiceTab';
import { VendorPaymentTab } from './expenses/VendorPaymentTab';

interface Props {
  projectId: string;
}

export function ProjectExpensesTab({ projectId }: Props) {
  const [activeTab, setActiveTab] = useState('contracts');
  const [prefilledPaymentData, setPrefilledPaymentData] = useState<{
    vendorId: string;
    poId?: string;
    invoiceId?: string;
    amount?: number;
  } | null>(null);

  const handleRequestPayment = (paymentData: { vendorId: string; poId?: string; invoiceId?: string; amount?: number }) => {
    setPrefilledPaymentData(paymentData);
    setActiveTab('payments');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Project Expenses</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">Vendor Contract/POs</TabsTrigger>
          <TabsTrigger value="invoices">Vendor Invoice</TabsTrigger>
          <TabsTrigger value="payments">Vendor Payment/Progress Invoice</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="mt-6">
          <VendorContractsPOsTab projectId={projectId} onRequestPayment={handleRequestPayment} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <VendorInvoiceTab projectId={projectId} onRequestPayment={handleRequestPayment} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <VendorPaymentTab 
            projectId={projectId} 
            prefilledData={prefilledPaymentData}
            onDataUsed={() => setPrefilledPaymentData(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}