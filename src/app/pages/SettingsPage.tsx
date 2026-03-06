import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { User, Globe, Bell, Building2, FileText, Save, Hash, FolderTree, Users, Shield, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { NumberSequenceSettings } from '../components/settings/NumberSequenceSettings';
import { BudgetCategoriesSettings } from '../components/settings/BudgetCategoriesSettings';
import { UsersManagement } from '../components/settings/UsersManagement';
import { ApprovalWorkflowsSettings } from '../components/settings/ApprovalWorkflowsSettings';
import { PermissionsMatrixSettings } from '../components/settings/PermissionsMatrixSettings';
import { usePermissionsMatrix } from '../contexts/PermissionsMatrixContext';
import { AccessDenied } from '../components/AccessDenied';

export function SettingsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissionsMatrix();
  const canViewSettings = hasPermission('settings', 'view');
  const canEditCompany = hasPermission('settings', 'edit_company');
  const canEditSystem = hasPermission('settings', 'edit_system');
  const canManageUsers = hasPermission('settings', 'manage_users');
  const canManageRoles = hasPermission('settings', 'manage_roles');
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

  const loadCompanyInfo = () => {
    try {
      const stored = localStorage.getItem('core_code_company_info');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { name: 'Core Code', address: 'Riyadh, Saudi Arabia', phone: '+966 11 234 5678', email: 'info@corecode.sa', vatNumber: '300123456700003', logoBase64: '' };
  };

  const [company, setCompany] = useState(loadCompanyInfo);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCompany((prev: typeof company) => ({ ...prev, logoBase64: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  const handleSaveCompany = () => {
    localStorage.setItem('core_code_company_info', JSON.stringify(company));
    window.dispatchEvent(new CustomEvent('companyInfoUpdated'));
    toast.success('Company settings updated');
  };

  if (!canViewSettings) {
    return <AccessDenied message={t('common.accessDenied')} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('nav.settings')}</h1>
        <p className="text-gray-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            {t('settings.company')}
          </TabsTrigger>
          <TabsTrigger value="numberSequences">
            <Hash className="w-4 h-4 mr-2" />
            {t('settings.numberSequences')}
          </TabsTrigger>
          <TabsTrigger value="budgetCategories">
            <FolderTree className="w-4 h-4 mr-2" />
            {t('settings.budgetCategories')}
          </TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              {t('settings.users')}
            </TabsTrigger>
          )}
          {canEditSystem && (
            <TabsTrigger value="approvalWorkflows">
              <Shield className="w-4 h-4 mr-2" />
              {t('nav.approvalWorkflows')}
            </TabsTrigger>
          )}
          {canManageRoles && (
            <TabsTrigger value="permissionsMatrix">
              <GitBranch className="w-4 h-4 mr-2" />
              {t('nav.permissionsMatrix')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.companyInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label>{t('settings.companyName')}</Label>
                  <Input
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('settings.companyLogo')}</Label>
                  <div className="flex items-center gap-4">
                    {company.logoBase64 ? (
                      <img src={company.logoBase64} alt="Company Logo" className="w-16 h-16 rounded object-contain border" />
                    ) : (
                      <div className="w-16 h-16 bg-[#7A1516] text-white rounded flex items-center justify-center text-2xl font-bold">CC</div>
                    )}
                    <div>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">{t('common.uploadLogo')}</span>
                        <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">{t('settings.logoHint')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('common.address')}</Label>
                  <Input
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('common.phone')}</Label>
                    <Input
                      value={company.phone}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.email')}</Label>
                    <Input
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('vendors.vatNumber')}</Label>
                  <Input
                    value={company.vatNumber}
                    onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })}
                  />
                </div>

                <Button onClick={handleSaveCompany} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  <Save className="w-4 h-4 mr-2" />
                  {t('common.saveChanges')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numberSequences" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.numberSequences')}</CardTitle>
            </CardHeader>
            <CardContent>
              <NumberSequenceSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgetCategories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.budgetCategories')}</CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetCategoriesSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.usersManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvalWorkflows" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.approvalWorkflows')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalWorkflowsSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissionsMatrix" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.permissionsMatrix')}</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionsMatrixSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}