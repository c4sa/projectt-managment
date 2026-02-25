import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-gray-500 mt-1">Track payments and banking transactions</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Payment tracking interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
