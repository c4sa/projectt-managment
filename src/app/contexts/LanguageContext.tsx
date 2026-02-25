import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.tasks': 'Tasks',
    'nav.vendors': 'Vendors',
    'nav.customers': 'Customers',
    'nav.employees': 'Employees',
    'nav.purchaseOrders': 'Purchase Orders',
    'nav.invoices': 'Invoices',
    'nav.payments': 'Payments',
    'nav.reports': 'Reports',
    'nav.documents': 'Documents',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    
    // Common
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.amount': 'Amount',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.vat': 'VAT',
    'common.logout': 'Logout',
    'common.profile': 'Profile',
    'common.notifications': 'Notifications',
    
    // Auth
    'auth.login': 'Login',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.welcomeBack': 'Welcome Back',
    
    // Projects
    'projects.title': 'Projects',
    'projects.newProject': 'New Project',
    'projects.projectName': 'Project Name',
    'projects.status.planning': 'Planning',
    'projects.status.active': 'Active',
    'projects.status.on_hold': 'On Hold',
    'projects.status.completed': 'Completed',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.revenue': 'Revenue',
    'dashboard.expenses': 'Expenses',
    'dashboard.profit': 'Profit',
    'dashboard.outstanding': 'Outstanding',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.projects': 'المشاريع',
    'nav.tasks': 'المهام',
    'nav.vendors': 'الموردين',
    'nav.customers': 'العملاء',
    'nav.employees': 'الموظفين',
    'nav.purchaseOrders': 'أوامر الشراء',
    'nav.invoices': 'الفواتير',
    'nav.payments': 'المدفوعات',
    'nav.reports': 'التقارير',
    'nav.documents': 'المستندات',
    'nav.users': 'المستخدمين',
    'nav.settings': 'الإعدادات',
    
    // Common
    'common.add': 'إضافة',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.actions': 'إجراءات',
    'common.status': 'الحالة',
    'common.date': 'التاريخ',
    'common.amount': 'المبلغ',
    'common.total': 'المجموع',
    'common.subtotal': 'المجموع الفرعي',
    'common.vat': 'ضريبة القيمة المضافة',
    'common.logout': 'تسجيل الخروج',
    'common.profile': 'الملف الشخصي',
    'common.notifications': 'الإشعارات',
    
    // Auth
    'auth.login': 'تسجيل الدخول',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.welcomeBack': 'مرحباً بعودتك',
    
    // Projects
    'projects.title': 'المشاريع',
    'projects.newProject': 'مشروع جديد',
    'projects.projectName': 'اسم المشروع',
    'projects.status.planning': 'التخطيط',
    'projects.status.active': 'نشط',
    'projects.status.on_hold': 'معلق',
    'projects.status.completed': 'مكتمل',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.revenue': 'الإيرادات',
    'dashboard.expenses': 'المصروفات',
    'dashboard.profit': 'الربح',
    'dashboard.outstanding': 'المستحقات',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('core_code_language') as Language;
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguageState(storedLang);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('core_code_language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}