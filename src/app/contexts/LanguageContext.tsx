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
    'nav.approvalPermissions': 'Approval Permissions',
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
    'projects.assignManager': 'Assign Project Manager',
    'projects.selectManager': 'Select manager',
    'projects.managerRequired': 'Project manager is required',
    'projects.managerRequiredError': 'Please select a project manager',
    
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

    // Roles
    'roles.admin': 'Admin',
    'roles.projectManager': 'Project Manager',
    'roles.financeManager': 'Finance Manager',
    'roles.ceo': 'CEO',

    // Team
    'team.title': 'Team Management',
    'team.description': 'Manage project team members and permissions',
    'team.projectManager': 'Project Manager',
    'team.fullAccess': 'Full Access',
    'team.teamMembers': 'Team Members',
    'team.members': 'members',
    'team.addMember': 'Add Member',
    'team.addFirstMember': 'Add first member',
    'team.noMembers': 'No team members yet',
    'team.userAlreadyMember': 'User is already a team member',
    'team.memberAdded': 'Member added successfully',
    'team.memberRemoved': 'Member removed',
    'team.permissionsUpdated': 'Permissions updated',
    'team.addMemberDesc': 'Add a user to this project team',
    'team.selectUser': 'Select user',
    'team.selectUserPlaceholder': 'Choose a user...',
    'team.defaultPermissions': 'Default permissions for new members',
    'team.documentsEnabled': 'Documents access enabled',
    'team.tasksEnabled': 'Tasks access enabled',
    'team.expensesDisabled': 'Expenses access disabled',
    'team.incomeDisabled': 'Income access disabled',
    'team.canChangePermissions': 'You can change permissions after adding',
    'team.editPermissions': 'Edit Permissions',
    'team.editPermissionsFor': 'Edit permissions for',
    'team.permissions': 'Permissions',
    'team.expenses': 'Expenses',
    'team.income': 'Income',
    'team.budget': 'Budget',
    'team.documents': 'Documents',
    'team.tasks': 'Tasks',
    'team.expensesDesc': 'Can manage purchase orders and invoices',
    'team.incomeDesc': 'Can manage customer invoices',
    'team.budgetPMOnly': 'Only Project Manager can modify budget',
    'team.documentsAlwaysEnabled': 'Documents always enabled for team',
    'team.tasksAlwaysEnabled': 'Tasks always enabled for team',

    // Documents
    'documents.discussion': 'Discussion',
    'documents.comments': 'comments',
    'documents.noComments': 'No comments yet',
    'documents.startDiscussion': 'Start the discussion',
    'documents.commentAdded': 'Comment added',
    'documents.commentUpdated': 'Comment updated',
    'documents.commentDeleted': 'Comment deleted',
    'documents.edited': 'edited',
    'documents.typeMessage': 'Type a message...',
    'documents.onlyProjectMembers': 'Only project members can comment',

    // Approvals
    'approvals.title': 'Approval Permissions',
    'approvals.description': 'Configure approval workflows for purchase orders, invoices, and payments',
    'approvals.workflows': 'Workflows',
    'approvals.selectWorkflow': 'Select a workflow to edit',
    'approvals.selectWorkflowToEdit': 'Select a workflow to edit',
    'approvals.step': 'Step',
    'approvals.steps': 'steps',
    'approvals.noSteps': 'No approval steps configured',
    'approvals.addStep': 'Add Step',
    'approvals.editStep': 'Edit Step',
    'approvals.stepDialogDesc': 'Configure who approves and under what conditions',
    'approvals.approverRole': 'Approver Role',
    'approvals.requiredApproval': 'Required approval',
    'approvals.addCondition': 'Add condition',
    'approvals.conditionField': 'Condition field',
    'approvals.condition': 'Condition',
    'approvals.operator': 'Operator',
    'approvals.value': 'Value',
    'approvals.amount': 'Amount',
    'approvals.projectType': 'Project type',
    'approvals.department': 'Department',
    'approvals.required': 'Required',
    'approvals.active': 'Active',
    'approvals.purchaseOrder': 'Purchase Order',
    'approvals.vendorInvoice': 'Vendor Invoice',
    'approvals.payment': 'Payment',
    'approvals.budgetChange': 'Budget Change',
    'approvals.stepRemoved': 'Step removed',
    'approvals.stepAdded': 'Step added',
    'approvals.stepUpdated': 'Step updated',
    'approvals.workflowSaved': 'Workflow saved',
    'approvals.noPermission': 'You do not have permission to access this page',
    'approvals.viewOnly': 'You can view but not edit approval workflows',
    'approvals.howItWorks': 'How it works',
    'approvals.dragToReorder': 'Drag to reorder steps',
    'approvals.stepsExecutedInOrder': 'Steps are executed in order',
    'approvals.conditionsOptional': 'Conditions are optional',
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
    'nav.approvalPermissions': 'صلاحيات الموافقة',
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
    'projects.assignManager': 'تعيين مدير المشروع',
    'projects.selectManager': 'اختر المدير',
    'projects.managerRequired': 'مدير المشروع مطلوب',
    'projects.managerRequiredError': 'يرجى اختيار مدير المشروع',
    
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

    // Roles
    'roles.admin': 'مدير النظام',
    'roles.projectManager': 'مدير المشروع',
    'roles.financeManager': 'مدير المالية',
    'roles.ceo': 'الرئيس التنفيذي',

    // Team
    'team.title': 'إدارة الفريق',
    'team.description': 'إدارة أعضاء الفريق وصلاحياتهم',
    'team.projectManager': 'مدير المشروع',
    'team.fullAccess': 'وصول كامل',
    'team.teamMembers': 'أعضاء الفريق',
    'team.members': 'أعضاء',
    'team.addMember': 'إضافة عضو',
    'team.addFirstMember': 'أضف أول عضو',
    'team.noMembers': 'لا يوجد أعضاء في الفريق بعد',
    'team.userAlreadyMember': 'المستخدم عضو بالفعل',
    'team.memberAdded': 'تم إضافة العضو بنجاح',
    'team.memberRemoved': 'تم إزالة العضو',
    'team.permissionsUpdated': 'تم تحديث الصلاحيات',
    'team.addMemberDesc': 'إضافة مستخدم لفريق المشروع',
    'team.selectUser': 'اختر المستخدم',
    'team.selectUserPlaceholder': 'اختر مستخدماً...',
    'team.defaultPermissions': 'الصلاحيات الافتراضية للأعضاء الجدد',
    'team.documentsEnabled': 'وصول المستندات مفعّل',
    'team.tasksEnabled': 'وصول المهام مفعّل',
    'team.expensesDisabled': 'وصول المصروفات معطّل',
    'team.incomeDisabled': 'وصول الإيرادات معطّل',
    'team.canChangePermissions': 'يمكنك تغيير الصلاحيات بعد الإضافة',
    'team.editPermissions': 'تعديل الصلاحيات',
    'team.editPermissionsFor': 'تعديل صلاحيات',
    'team.permissions': 'الصلاحيات',
    'team.expenses': 'المصروفات',
    'team.income': 'الإيرادات',
    'team.budget': 'الميزانية',
    'team.documents': 'المستندات',
    'team.tasks': 'المهام',
    'team.expensesDesc': 'يمكن إدارة أوامر الشراء والفواتير',
    'team.incomeDesc': 'يمكن إدارة فواتير العملاء',
    'team.budgetPMOnly': 'فقط مدير المشروع يمكنه تعديل الميزانية',
    'team.documentsAlwaysEnabled': 'المستندات دائماً مفعّلة للفريق',
    'team.tasksAlwaysEnabled': 'المهام دائماً مفعّلة للفريق',

    // Documents
    'documents.discussion': 'النقاش',
    'documents.comments': 'تعليقات',
    'documents.noComments': 'لا توجد تعليقات بعد',
    'documents.startDiscussion': 'ابدأ النقاش',
    'documents.commentAdded': 'تم إضافة التعليق',
    'documents.commentUpdated': 'تم تحديث التعليق',
    'documents.commentDeleted': 'تم حذف التعليق',
    'documents.edited': 'تم التعديل',
    'documents.typeMessage': 'اكتب رسالة...',
    'documents.onlyProjectMembers': 'فقط أعضاء المشروع يمكنهم التعليق',

    // Approvals
    'approvals.title': 'صلاحيات الموافقة',
    'approvals.description': 'تكوين سير عمل الموافقة لأوامر الشراء والفواتير والمدفوعات',
    'approvals.workflows': 'سير العمل',
    'approvals.selectWorkflow': 'اختر سير عمل للتعديل',
    'approvals.selectWorkflowToEdit': 'اختر سير عمل للتعديل',
    'approvals.step': 'خطوة',
    'approvals.steps': 'خطوات',
    'approvals.noSteps': 'لم يتم تكوين خطوات موافقة',
    'approvals.addStep': 'إضافة خطوة',
    'approvals.editStep': 'تعديل الخطوة',
    'approvals.stepDialogDesc': 'تحديد من يوافق وتحت أي شروط',
    'approvals.approverRole': 'دور الموافق',
    'approvals.requiredApproval': 'موافقة مطلوبة',
    'approvals.addCondition': 'إضافة شرط',
    'approvals.conditionField': 'حقل الشرط',
    'approvals.condition': 'الشرط',
    'approvals.operator': 'العامل',
    'approvals.value': 'القيمة',
    'approvals.amount': 'المبلغ',
    'approvals.projectType': 'نوع المشروع',
    'approvals.department': 'القسم',
    'approvals.required': 'مطلوب',
    'approvals.active': 'نشط',
    'approvals.purchaseOrder': 'أمر الشراء',
    'approvals.vendorInvoice': 'فاتورة المورد',
    'approvals.payment': 'الدفع',
    'approvals.budgetChange': 'تغيير الميزانية',
    'approvals.stepRemoved': 'تم إزالة الخطوة',
    'approvals.stepAdded': 'تم إضافة الخطوة',
    'approvals.stepUpdated': 'تم تحديث الخطوة',
    'approvals.workflowSaved': 'تم حفظ سير العمل',
    'approvals.noPermission': 'ليس لديك صلاحية للوصول لهذه الصفحة',
    'approvals.viewOnly': 'يمكنك العرض فقط وليس التعديل',
    'approvals.howItWorks': 'كيف يعمل',
    'approvals.dragToReorder': 'اسحب لإعادة ترتيب الخطوات',
    'approvals.stepsExecutedInOrder': 'الخطوات تُنفّذ بالترتيب',
    'approvals.conditionsOptional': 'الشروط اختيارية',
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