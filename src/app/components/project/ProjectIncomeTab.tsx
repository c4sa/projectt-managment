import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useProjectPermissions } from '../../contexts/ProjectPermissionsContext';
import type { Project } from '../../data/store';
import { Alert, AlertDescription } from '../ui/alert';
import { CustomerInvoiceTab } from './income/CustomerInvoiceTab';
import { CustomerPaymentTab } from './income/CustomerPaymentTab';

interface Props {
  projectId: string;
  project?: Project;
}

export function ProjectIncomeTab({ projectId, project }: Props) {
  const permissions = useProjectPermissions();
  const canModifyIncome = !project || permissions.hasPermission(project, 'income');
  const [activeTab, setActiveTab] = useState('invoices');
  const [prefilledPaymentData, setPrefilledPaymentData] = useState<{
    customerId: string;
    invoiceId: string;
    amount: number;
  } | null>(null);

  const handleRequestPayment = (paymentData: { customerId: string; invoiceId: string; amount: number }) => {
    setPrefilledPaymentData(paymentData);
    setActiveTab('payments');
  };

  if (!canModifyIncome) {
    return (
      <Alert>
        <AlertDescription>
          You do not have permission to manage income. Contact your project manager.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Project Income</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">Customer Invoices</TabsTrigger>
          <TabsTrigger value="payments">Customer Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6">
          <CustomerInvoiceTab projectId={projectId} onRequestPayment={handleRequestPayment} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <CustomerPaymentTab 
            projectId={projectId} 
            prefilledData={prefilledPaymentData}
            onDataUsed={() => setPrefilledPaymentData(null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}