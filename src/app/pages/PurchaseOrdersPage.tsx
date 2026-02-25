import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function PurchaseOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <p className="text-gray-500 mt-1">Manage purchase orders and procurement</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Purchase orders management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
