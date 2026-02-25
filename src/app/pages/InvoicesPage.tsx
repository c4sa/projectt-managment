import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-gray-500 mt-1">Manage vendor and customer invoices</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Invoice management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
