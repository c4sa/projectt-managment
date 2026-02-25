import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, Globe, Bell, Building2, FileText, Save, Hash, FolderTree, Users } from 'lucide-react';
import { toast } from 'sonner';
import { NumberSequenceSettings } from '../components/settings/NumberSequenceSettings';
import { BudgetCategoriesSettings } from '../components/settings/BudgetCategoriesSettings';
import { UsersManagement } from '../components/settings/UsersManagement';

export function SettingsPage() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });

  const [notifications, setNotifications] = useState({
    emailInvoice: true,
    emailPayment: true,
    emailTask: false,
    inAppInvoice: true,
    inAppPayment: true,
    inAppTask: true,
    inAppProject: true,
  });

  const [company, setCompany] = useState({
    name: 'Core Code',
    address: 'Riyadh, Saudi Arabia',
    phone: '+966 11 234 5678',
    email: 'info@corecode.sa',
    vatNumber: '300123456700003',
  });

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  const handleSaveCompany = () => {
    toast.success('Company settings updated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
        <p className="text-gray-500 mt-1">Manage system and organization-wide settings</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="numberSequences">
            <Hash className="w-4 h-4 mr-2" />
            Number Sequences
          </TabsTrigger>
          <TabsTrigger value="budgetCategories">
            <FolderTree className="w-4 h-4 mr-2" />
            Budget Categories
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#7A1516] text-white rounded flex items-center justify-center text-2xl font-bold">
                      CC
                    </div>
                    <Button variant="outline" size="sm">Upload Logo</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>VAT Number</Label>
                  <Input
                    value={company.vatNumber}
                    onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
                  />
                </div>

                <Button onClick={handleSaveCompany} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numberSequences" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Number Sequences</CardTitle>
            </CardHeader>
            <CardContent>
              <NumberSequenceSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgetCategories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetCategoriesSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Users Management</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}