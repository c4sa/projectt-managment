import React, { useState, useEffect } from 'react';
import { Project, dataStore } from '../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  project: Project;
}

export function ProjectDashboardTab({ project }: Props) {
  const [payments, setPayments] = useState<any[]>([]);
  
  useEffect(() => {
    const loadPayments = async () => {
      const paymentsData = await dataStore.getPayments(project.id);
      setPayments(paymentsData);
    };
    loadPayments();
  }, [project.id]);
  
  const budget = project.budget || 0;
  
  // Calculate spent from PAID payments only
  const spent = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const progress = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = budget - spent;

  const budgetData = [
    { name: 'Spent', value: spent, color: '#7A1516' },
    { name: 'Remaining', value: remaining, color: '#cbd5e1' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={budgetData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${(entry.value || 0).toLocaleString()} SAR`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${((value as number) || 0).toLocaleString()} SAR`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Location</div>
              <div className="font-medium">{project.location || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Description</div>
              <div className="font-medium">{project.description || 'N/A'}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Start Date</div>
                <div className="font-medium">{new Date(project.startDate).toLocaleDateString()}</div>
              </div>
              {project.endDate && (
                <div>
                  <div className="text-sm text-gray-500">End Date</div>
                  <div className="font-medium">{new Date(project.endDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-semibold">{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-[#7A1516] h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">Total Budget</div>
                <div className="text-2xl font-bold text-blue-700">{budget.toLocaleString()} SAR</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-sm text-red-600 mb-1">Total Spent</div>
                <div className="text-2xl font-bold text-red-700">{spent.toLocaleString()} SAR</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Remaining</div>
                <div className="text-2xl font-bold text-green-700">{remaining.toLocaleString()} SAR</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}