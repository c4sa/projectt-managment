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
    'common.reset': 'Reset',

    // Document types
    'claim': 'Claim',
    'customer': 'Customer',
    'invoice': 'Invoice',
    'payment': 'Payment',
    'project': 'Project',
    'purchaseOrder': 'Purchase Order',
    'variationOrder': 'Variation Order',
    'vendor': 'Vendor',
    
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

    // Vendors
    'vendors.title': 'Vendors',
    'vendors.newVendor': 'New Vendor',
    'vendors.vendorName': 'Vendor Name',
    'vendors.specialty': 'Specialty',
    'vendors.contactPerson': 'Contact Person',
    'vendors.iban': 'IBAN',
    'vendors.vatNumber': 'VAT Number',

    // Customers
    'customers.title': 'Customers',
    'customers.newCustomer': 'New Customer',
    'customers.customerName': 'Customer Name',

    // Employees
    'employees.title': 'Employees',
    'employees.newEmployee': 'New Employee',

    // Purchase Orders
    'purchaseOrders.title': 'Purchase Orders',
    'purchaseOrders.newPO': 'New Purchase Order',

    // Invoices
    'invoices.title': 'Invoices',
    'invoices.newInvoice': 'New Invoice',

    // Payments
    'payments.title': 'Payments',
    'payments.newPayment': 'New Payment',

    // Reports
    'reports.title': 'Reports',

    // Settings
    'settings.title': 'Settings',

    // Common extras
    'common.name': 'Name',
    'common.email': 'Email',
    'common.phone': 'Phone',
    'common.address': 'Address',
    'common.description': 'Description',
    'common.notes': 'Notes',
    'common.createdAt': 'Created At',
    'common.updatedAt': 'Updated At',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.loading': 'Loading...',
    'common.noData': 'No data found',
    'common.back': 'Back',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.view': 'View',
    'common.download': 'Download',
    'common.print': 'Print',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.all': 'All',
    'common.from': 'From',
    'common.to': 'To',
    'common.of': 'of',
    'common.page': 'Page',
    'common.rows': 'rows',
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
    'common.reset': 'إعادة تعيين',

    // Document types
    'claim': 'مطالبة',
    'customer': 'عميل',
    'invoice': 'فاتورة',
    'payment': 'دفعة',
    'project': 'مشروع',
    'purchaseOrder': 'أمر شراء',
    'variationOrder': 'أمر تغيير',
    'vendor': 'مورد',
    
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

    // Vendors
    'vendors.title': 'الموردون',
    'vendors.newVendor': 'مورد جديد',
    'vendors.vendorName': 'اسم المورد',
    'vendors.specialty': 'التخصص',
    'vendors.contactPerson': 'جهة الاتصال',
    'vendors.iban': 'رقم الآيبان',
    'vendors.vatNumber': 'الرقم الضريبي',

    // Customers
    'customers.title': 'العملاء',
    'customers.newCustomer': 'عميل جديد',
    'customers.customerName': 'اسم العميل',

    // Employees
    'employees.title': 'الموظفون',
    'employees.newEmployee': 'موظف جديد',

    // Purchase Orders
    'purchaseOrders.title': 'أوامر الشراء',
    'purchaseOrders.newPO': 'أمر شراء جديد',

    // Invoices
    'invoices.title': 'الفواتير',
    'invoices.newInvoice': 'فاتورة جديدة',

    // Payments
    'payments.title': 'المدفوعات',
    'payments.newPayment': 'دفعة جديدة',

    // Reports
    'reports.title': 'التقارير',

    // Settings
    'settings.title': 'الإعدادات',

    // Common extras
    'common.name': 'الاسم',
    'common.email': 'البريد الإلكتروني',
    'common.phone': 'الهاتف',
    'common.address': 'العنوان',
    'common.description': 'الوصف',
    'common.notes': 'ملاحظات',
    'common.createdAt': 'تاريخ الإنشاء',
    'common.updatedAt': 'تاريخ التحديث',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.loading': 'جاري التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.back': 'رجوع',
    'common.close': 'إغلاق',
    'common.confirm': 'تأكيد',
    'common.view': 'عرض',
    'common.download': 'تنزيل',
    'common.print': 'طباعة',
    'common.active': 'نشط',
    'common.inactive': 'غير نشط',
    'common.all': 'الكل',
    'common.from': 'من',
    'common.to': 'إلى',
    'common.of': 'من',
    'common.page': 'صفحة',
    'common.rows': 'صفوف',
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