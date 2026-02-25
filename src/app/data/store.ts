// This file contains the data store and types for all modules
// Data is persisted via the API (Express locally, Vercel serverless in production)
// which stores everything in Supabase (kv_store_02fd4b7a table).

import { numberGenerator } from '../utils/numberGenerator';

// API base: set VITE_API_BASE_URL=http://localhost:3000 in .env.local for local dev.
// On Vercel, leave it unset and the app uses relative /api/... paths.
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';

// Helper function for API calls
async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  const text = await response.text();

  if (!text || text.trim() === '') {
    if (!response.ok) {
      throw new Error(`API call failed with status ${response.status}`);
    }
    return null;
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${endpoint}: ${text.substring(0, 100)}`);
  }

  if (!data.success) {
    throw new Error(data.error || `API call failed for ${endpoint}`);
  }

  return data.data;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type POStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'issued' | 'received' | 'partially_paid' | 'paid';
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'sent';
export type VOStatus = 'pending' | 'approved' | 'rejected';
export type PaymentRequestStatus = 'pending' | 'level1_approved' | 'fully_approved' | 'rejected';
export type PaymentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';
export type PaymentMethod = 'bank_transfer' | 'cheque' | 'cash';
export type DocumentType = 'contract' | 'drawing' | 'report' | 'invoice' | 'permit' | 'other';
export type BudgetCategory = string; // Dynamic categories

export type ManpowerRole =
  | 'project_manager'
  | 'assistant_pm'
  | 'site_engineer'
  | 'foreman'
  | 'technician_electrical'
  | 'technician_plumbing'
  | 'technician_hvac'
  | 'helper_laborer'
  | 'safety_officer'
  | 'qa_qc';

export interface ManpowerMember {
  id: string;
  projectId: string;
  name: string;
  role: ManpowerRole;
  employeeId?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  idNumber?: string;
  joiningDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectManpower {
  id: string;
  projectId: string;
  siteEngineers?: number;
  foremen?: number;
  techniciansElectrical?: number;
  techniciansPlumbing?: number;
  techniciansHVAC?: number;
  helpersLaborers?: number;
  safetyOfficers?: number;
  qaQc?: number;
  projectManager?: number;
  assistantPM?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  status: ProjectStatus;
  customerId: string;
  projectManager?: string;
  assistantPM?: string;
  teamMembers: string[];
  startDate: string;
  endDate?: string;
  description?: string;
  location?: string;
  budget: number;
  spent: number;
  contractValue?: number;
  vatStatus?: 'not_applicable' | 'inclusive' | 'exclusive';
  contractDocument?: string;
  contractLink?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  vatNumber?: string;
  contactPerson?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  bankName: string;
  iban: string;
  vatNumber?: string;
  specialty?: string;
  address?: string;
  contactPerson?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[];
  dueDate?: string;
  groupId?: string;
  dependencies: string[];
  customFields: Record<string, any>;
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  attachments: string[];
  mentions: string[];
  createdAt: string;
}

export interface TaskGroup {
  id: string;
  projectId: string;
  name: string;
  color: string;
  order: number;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  category: BudgetCategory;
  name: string;
  budgeted: number;
  reserved: number;
  actual: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  projectId: string;
  status: POStatus;
  issueDate: string;
  deliveryDate?: string;
  items: POLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  budgetCategory?: BudgetCategory;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  modifiedAt?: string;
  modifiedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  modificationRequestedBy?: string;
  modificationRequestedDate?: string;
  modificationRequestReason?: string;
}

export interface POLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

export interface VariationOrder {
  id: string;
  voNumber: string;
  poId: string;
  projectId: string;
  originalAmount: number;
  variationAmount: number;
  totalAmount: number;
  status: VOStatus;
  description: string;
  approvalDate?: string;
  rejectionReason?: string;
  budgetCategory?: BudgetCategory;
  createdAt: string;
}

export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  projectId: string;
  poId?: string;
  status: InvoiceStatus;
  issueDate: string;
  invoiceDate?: string;
  description?: string;
  dueDate: string;
  paymentDate?: string;
  items: POLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  vat?: number;
  vatTreatment?: 'not_applicable' | 'inclusive' | 'exclusive';
  total: number;
  budgetCategory?: BudgetCategory;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  attachmentCount?: number;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  sentForApprovalBy?: string;
  sentForApprovalDate?: string;
  modificationRequestedBy?: string;
  modificationRequestedDate?: string;
  modificationRequestReason?: string;
}

export interface VendorClaim {
  id: string;
  claimNumber: string;
  vendorId: string;
  projectId: string;
  poId?: string;
  status: PaymentRequestStatus;
  submittedDate: string;
  approvedDate?: string;
  items: ClaimLineItem[];
  variationOrders: string[];
  retentionRate: number;
  retentionAmount: number;
  vatInclusive: boolean;
  subtotal: number;
  vatAmount: number;
  total: number;
  rejectionReason?: string;
  createdAt: string;
}

export interface ClaimLineItem {
  id: string;
  description: string;
  poQuantity: number;
  unitPrice: number;
  completionPercent: number;
  claimAmount: number;
  previousPayments: number;
  remaining: number;
}

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  projectId: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  items: POLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  amountPaid?: number;
  notes?: string;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  requestNumber: string;
  type: 'vendor_invoice' | 'customer_receipt';
  linkedId: string;
  amount: number;
  status: PaymentRequestStatus;
  requestedBy: string;
  requestDate: string;
  level1ApprovedBy?: string;
  level1ApprovedDate?: string;
  fullyApprovedBy?: string;
  fullyApprovedDate?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  type: 'receipt' | 'payment';
  customerId?: string;
  vendorId?: string;
  projectId: string;
  invoiceId?: string;
  poId?: string;
  amount: number;
  subtotal?: number;
  vat?: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  status: PaymentStatus;
  lineItemPayments?: any[];
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  paidBy?: string;
  paidByName?: string;
  paidDate?: string;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PrintTemplate {
  id: string;
  name: string;
  type: 'purchase_order' | 'vendor_invoice' | 'claim' | 'variation_order' | 'customer_invoice';
  logoUrl?: string;
  headerColor: string;
  fontFamily: string;
  header?: string;
  footer?: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  isDefault: boolean;
  createdAt: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  employeeId?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  idNumber?: string;
  passportNumber?: string;
  department?: string;
  position?: string;
  assignedRole?: string;
  joiningDate?: string;
  bankName?: string;
  iban?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'on_leave';
  userId?: string;
  createdAt: string;
  updatedAt?: string;
}

// Data Store — all data lives in Supabase via the API
class DataStore {
  // Projects
  async getProjects(): Promise<Project[]> {
    return (await apiCall('/projects')) ?? [];
  }

  async getProjectAsync(id: string): Promise<Project | null> {
    try {
      return await apiCall(`/projects/${id}`);
    } catch {
      return null;
    }
  }

  async addProject(project: Omit<Project, 'id' | 'createdAt' | 'code'>): Promise<Project> {
    const code = numberGenerator.generateNumber('project');
    const newProject = { ...project, code, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/projects', 'POST', newProject);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return await apiCall(`/projects/${id}`, 'PUT', updates);
  }

  async deleteProject(id: string): Promise<void> {
    await apiCall(`/projects/${id}`, 'DELETE');
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return (await apiCall('/customers')) ?? [];
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      return await apiCall(`/customers/${id}`);
    } catch {
      return null;
    }
  }

  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'code'>): Promise<Customer> {
    const code = numberGenerator.generateNumber('customer');
    const newCustomer = { ...customer, id: Date.now().toString(), code, createdAt: new Date().toISOString() };
    return await apiCall('/customers', 'POST', newCustomer);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return await apiCall(`/customers/${id}`, 'PUT', updates);
  }

  async deleteCustomer(id: string): Promise<void> {
    await apiCall(`/customers/${id}`, 'DELETE');
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return (await apiCall('/vendors')) ?? [];
  }

  async getVendor(id: string): Promise<Vendor | null> {
    try {
      const vendors = await this.getVendors();
      return vendors.find((v: Vendor) => v.id === id) ?? null;
    } catch {
      return null;
    }
  }

  async addVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'code'>): Promise<Vendor> {
    const code = numberGenerator.generateNumber('vendor');
    const newVendor = { ...vendor, id: Date.now().toString(), code, createdAt: new Date().toISOString() };
    return await apiCall('/vendors', 'POST', newVendor);
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
    return await apiCall(`/vendors/${id}`, 'PUT', updates);
  }

  async deleteVendor(id: string): Promise<void> {
    await apiCall(`/vendors/${id}`, 'DELETE');
  }

  // Tasks
  async getTasks(projectId?: string): Promise<Task[]> {
    const all: Task[] = (await apiCall('/tasks')) ?? [];
    return projectId ? all.filter((t) => t.projectId === projectId) : all;
  }

  async getTask(id: string): Promise<Task | null> {
    try {
      return await apiCall(`/tasks/${id}`);
    } catch {
      return null;
    }
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return await apiCall('/tasks', 'POST', newTask);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return await apiCall(`/tasks/${id}`, 'PUT', { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteTask(id: string): Promise<void> {
    await apiCall(`/tasks/${id}`, 'DELETE');
  }

  // Task Groups
  async getTaskGroups(projectId: string): Promise<TaskGroup[]> {
    const all: TaskGroup[] = (await apiCall('/taskGroups')) ?? [];
    return all.filter((g) => g.projectId === projectId);
  }

  async addTaskGroup(group: Omit<TaskGroup, 'id'>): Promise<TaskGroup> {
    const newGroup = { ...group, id: Date.now().toString() };
    return await apiCall('/taskGroups', 'POST', newGroup);
  }

  async updateTaskGroup(id: string, updates: Partial<TaskGroup>): Promise<TaskGroup> {
    return await apiCall(`/taskGroups/${id}`, 'PUT', updates);
  }

  async deleteTaskGroup(id: string): Promise<void> {
    await apiCall(`/taskGroups/${id}`, 'DELETE');
  }

  // Budget Items
  async getBudgetItems(projectId: string): Promise<BudgetItem[]> {
    const all: BudgetItem[] = (await apiCall('/budgetItems')) ?? [];
    return all
      .filter((b) => b.projectId === projectId)
      .map((item) => ({ ...item, reserved: item.reserved || 0 }));
  }

  async addBudgetItem(item: Omit<BudgetItem, 'id' | 'createdAt'>): Promise<BudgetItem> {
    const newItem = { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/budgetItems', 'POST', newItem);
  }

  async updateBudgetItem(id: string, updates: Partial<BudgetItem>): Promise<BudgetItem> {
    return await apiCall(`/budgetItems/${id}`, 'PUT', updates);
  }

  async deleteBudgetItem(id: string): Promise<void> {
    const item = await apiCall(`/budgetItems/${id}`);
    if (!item) throw new Error('Budget item not found');

    const itemIdentifier = `${item.category}-${item.name}`;

    const allPOs: PurchaseOrder[] = await this.getPurchaseOrders();
    const referencedInPO = allPOs.some((po) => {
      if (po.budgetCategory === item.category) return true;
      if (po.items && Array.isArray(po.items)) {
        return po.items.some((li: any) =>
          li.budgetCategory === item.category || li.budgetItem === itemIdentifier
        );
      }
      return false;
    });
    if (referencedInPO) {
      throw new Error(`Cannot delete budget item "${item.name}" because it is referenced by one or more Purchase Orders.`);
    }

    const allInvoices: VendorInvoice[] = await this.getVendorInvoices();
    const referencedInInvoice = allInvoices.some((inv) => {
      if (inv.budgetCategory === item.category) return true;
      if (inv.items && Array.isArray(inv.items)) {
        return inv.items.some((li: any) =>
          li.budgetCategory === item.category || li.budgetItem === itemIdentifier
        );
      }
      return false;
    });
    if (referencedInInvoice) {
      throw new Error(`Cannot delete budget item "${item.name}" because it is referenced by one or more Invoices.`);
    }

    const allPayments: Payment[] = await this.getPayments();
    const referencedInPayment = allPayments.some((p: any) => p.budgetCategory === item.category);
    if (referencedInPayment) {
      throw new Error(`Cannot delete budget item "${item.name}" because it is referenced by one or more Payments.`);
    }

    await apiCall(`/budgetItems/${id}`, 'DELETE');
  }

  async updateBudgetReserved(projectId: string, po: any, isApproving: boolean): Promise<void> {
    const budgetItems = await this.getBudgetItems(projectId);
    const hasItemCategories = po.items && po.items.some((item: any) => item.budgetCategory);

    if (hasItemCategories) {
      const categoryTotals: { [key: string]: number } = {};
      po.items.forEach((item: any) => {
        const category = item.budgetCategory || po.budgetCategory;
        if (category) {
          categoryTotals[category] = (categoryTotals[category] || 0) + item.total;
        }
      });
      for (const [category, amount] of Object.entries(categoryTotals)) {
        const budgetItem = budgetItems.find((b) => b.category === category);
        if (budgetItem) {
          const currentReserved = budgetItem.reserved || 0;
          const newReserved = isApproving
            ? currentReserved + amount
            : Math.max(0, currentReserved - amount);
          await this.updateBudgetItem(budgetItem.id, { reserved: newReserved });
        }
      }
    } else if (po.budgetCategory) {
      const budgetItem = budgetItems.find((b) => b.category === po.budgetCategory);
      if (budgetItem) {
        const currentReserved = budgetItem.reserved || 0;
        const subtotal = po.subtotal || 0;
        const newReserved = isApproving
          ? currentReserved + subtotal
          : Math.max(0, currentReserved - subtotal);
        await this.updateBudgetItem(budgetItem.id, { reserved: newReserved });
      }
    }
  }

  async updateBudgetActual(projectId: string, po: any, payment: any): Promise<void> {
    const budgetItems = await this.getBudgetItems(projectId);
    const hasItemCategories = po.items && po.items.some((item: any) => item.budgetCategory);

    if (hasItemCategories && payment.lineItemPayments) {
      const categoryTotals: { [key: string]: number } = {};
      payment.lineItemPayments.forEach((linePayment: any, index: number) => {
        const poItem = po.items[index];
        if (poItem) {
          const category = poItem.budgetCategory || po.budgetCategory;
          if (category) {
            categoryTotals[category] = (categoryTotals[category] || 0) + linePayment.paymentAmount;
          }
        }
      });
      for (const [category, amount] of Object.entries(categoryTotals)) {
        const budgetItem = budgetItems.find((b) => b.category === category);
        if (budgetItem) {
          await this.updateBudgetItem(budgetItem.id, { actual: (budgetItem.actual || 0) + amount });
        }
      }
    } else if (po.budgetCategory) {
      const budgetItem = budgetItems.find((b) => b.category === po.budgetCategory);
      if (budgetItem) {
        const subtotal = payment.subtotal || payment.amount || 0;
        await this.updateBudgetItem(budgetItem.id, { actual: (budgetItem.actual || 0) + subtotal });
      }
    }
  }

  // Purchase Orders
  async getPurchaseOrders(projectId?: string): Promise<PurchaseOrder[]> {
    const all: PurchaseOrder[] = (await apiCall('/purchase-orders')) ?? [];
    return projectId ? all.filter((po) => po.projectId === projectId) : all;
  }

  // Kept for compatibility — components should migrate to async getPurchaseOrders()
  getPurchaseOrdersSync(_projectId?: string): PurchaseOrder[] {
    console.warn('getPurchaseOrdersSync: sync access not supported without localStorage. Use getPurchaseOrders() instead.');
    return [];
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    try {
      return await apiCall(`/purchase-orders/${id}`);
    } catch {
      return null;
    }
  }

  async addPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>): Promise<PurchaseOrder> {
    const poNumber = numberGenerator.generateNumber('purchaseOrder');
    const newPO = { ...po, poNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/purchase-orders', 'POST', newPO);
  }

  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return await apiCall(`/purchase-orders/${id}`, 'PUT', updates);
  }

  async deletePurchaseOrder(id: string): Promise<boolean> {
    await apiCall(`/purchase-orders/${id}`, 'DELETE');
    return true;
  }

  // Variation Orders
  async getVariationOrders(poId?: string): Promise<VariationOrder[]> {
    const all: VariationOrder[] = (await apiCall('/variationOrders')) ?? [];
    return poId ? all.filter((vo) => vo.poId === poId) : all;
  }

  async addVariationOrder(vo: Omit<VariationOrder, 'id' | 'createdAt' | 'voNumber'>): Promise<VariationOrder> {
    const voNumber = numberGenerator.generateNumber('variationOrder');
    const newVO = { ...vo, voNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/variationOrders', 'POST', newVO);
  }

  async updateVariationOrder(id: string, updates: Partial<VariationOrder>): Promise<VariationOrder> {
    return await apiCall(`/variationOrders/${id}`, 'PUT', updates);
  }

  // Vendor Invoices
  async getVendorInvoices(vendorId?: string): Promise<VendorInvoice[]> {
    const all: VendorInvoice[] = (await apiCall('/vendorInvoices')) ?? [];
    return vendorId ? all.filter((i) => i.vendorId === vendorId) : all;
  }

  // Kept for compatibility — components should migrate to async getVendorInvoices()
  getVendorInvoicesSync(_vendorId?: string): VendorInvoice[] {
    console.warn('getVendorInvoicesSync: sync access not supported without localStorage. Use getVendorInvoices() instead.');
    return [];
  }

  async addVendorInvoice(invoice: Omit<VendorInvoice, 'id' | 'createdAt' | 'invoiceNumber'>): Promise<VendorInvoice> {
    const invoiceNumber = numberGenerator.generateNumber('invoice');
    const newInvoice = { ...invoice, invoiceNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/vendorInvoices', 'POST', newInvoice);
  }

  async updateVendorInvoice(id: string, updates: Partial<VendorInvoice>): Promise<VendorInvoice> {
    return await apiCall(`/vendorInvoices/${id}`, 'PUT', updates);
  }

  async deleteVendorInvoice(id: string): Promise<void> {
    await apiCall(`/vendorInvoices/${id}`, 'DELETE');
  }

  // Vendor Claims
  async getVendorClaims(vendorId?: string): Promise<VendorClaim[]> {
    const all: VendorClaim[] = (await apiCall('/vendorClaims')) ?? [];
    return vendorId ? all.filter((c) => c.vendorId === vendorId) : all;
  }

  async addVendorClaim(claim: Omit<VendorClaim, 'id' | 'createdAt' | 'claimNumber'>): Promise<VendorClaim> {
    const claimNumber = numberGenerator.generateNumber('claim');
    const newClaim = { ...claim, claimNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/vendorClaims', 'POST', newClaim);
  }

  async updateVendorClaim(id: string, updates: Partial<VendorClaim>): Promise<VendorClaim> {
    return await apiCall(`/vendorClaims/${id}`, 'PUT', updates);
  }

  // Customer Invoices
  async getCustomerInvoices(customerId?: string): Promise<CustomerInvoice[]> {
    const all: CustomerInvoice[] = (await apiCall('/customerInvoices')) ?? [];
    return customerId ? all.filter((i) => i.customerId === customerId) : all;
  }

  // Kept for compatibility — components should migrate to async getCustomerInvoices()
  getCustomerInvoicesSync(_customerId?: string): CustomerInvoice[] {
    console.warn('getCustomerInvoicesSync: sync access not supported without localStorage. Use getCustomerInvoices() instead.');
    return [];
  }

  async addCustomerInvoice(invoice: Omit<CustomerInvoice, 'id' | 'createdAt' | 'invoiceNumber'>): Promise<CustomerInvoice> {
    const invoiceNumber = numberGenerator.generateNumber('invoice');
    const newInvoice = { ...invoice, invoiceNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/customerInvoices', 'POST', newInvoice);
  }

  async updateCustomerInvoice(id: string, updates: Partial<CustomerInvoice>): Promise<CustomerInvoice> {
    return await apiCall(`/customerInvoices/${id}`, 'PUT', updates);
  }

  // Payment Requests
  async getPaymentRequests(): Promise<PaymentRequest[]> {
    return (await apiCall('/paymentRequests')) ?? [];
  }

  async addPaymentRequest(request: Omit<PaymentRequest, 'id' | 'createdAt' | 'requestNumber'>): Promise<PaymentRequest> {
    const requestNumber = numberGenerator.generateNumber('payment');
    const newRequest = { ...request, requestNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/paymentRequests', 'POST', newRequest);
  }

  async updatePaymentRequest(id: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest> {
    return await apiCall(`/paymentRequests/${id}`, 'PUT', updates);
  }

  // Payments
  async getPayments(projectId?: string): Promise<Payment[]> {
    const all: Payment[] = (await apiCall('/payments')) ?? [];
    return projectId ? all.filter((p) => p.projectId === projectId) : all;
  }

  generatePaymentNumber(): Promise<string> {
    return Promise.resolve(numberGenerator.previewNextNumber('payment'));
  }

  async addPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'paymentNumber'>): Promise<Payment> {
    const paymentNumber = numberGenerator.generateNumber('payment');
    const newPayment = { ...payment, paymentNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/payments', 'POST', newPayment);
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    return await apiCall(`/payments/${id}`, 'PUT', updates);
  }

  async deletePayment(id: string): Promise<void> {
    await apiCall(`/payments/${id}`, 'DELETE');
  }

  // Documents (stored as project-scoped records in the documents KV namespace)
  async getDocuments(projectId: string): Promise<Document[]> {
    const all: Document[] = (await apiCall('/documents')) ?? [];
    return all.filter((d) => d.projectId === projectId);
  }

  async addDocument(doc: Omit<Document, 'id'>): Promise<Document> {
    const newDoc = { ...doc, id: Date.now().toString() };
    return await apiCall('/documents', 'POST', newDoc);
  }

  async deleteDocument(id: string): Promise<void> {
    await apiCall(`/documents/${id}`, 'DELETE');
  }

  // Print Templates
  async getPrintTemplates(type?: PrintTemplate['type']): Promise<PrintTemplate[]> {
    const all: PrintTemplate[] = (await apiCall('/printTemplates')) ?? [];
    return type ? all.filter((t) => t.type === type) : all;
  }

  async addPrintTemplate(template: Omit<PrintTemplate, 'id' | 'createdAt'>): Promise<PrintTemplate> {
    const newTemplate = { ...template, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/printTemplates', 'POST', newTemplate);
  }

  async updatePrintTemplate(id: string, updates: Partial<PrintTemplate>): Promise<PrintTemplate> {
    return await apiCall(`/printTemplates/${id}`, 'PUT', updates);
  }

  async setDefaultTemplate(id: string, type: PrintTemplate['type']): Promise<void> {
    const all = await this.getPrintTemplates(type);
    for (const t of all) {
      await apiCall(`/printTemplates/${t.id}`, 'PUT', { isDefault: t.id === id });
    }
  }

  // Users
  async getUsers(): Promise<SystemUser[]> {
    return (await apiCall('/users')) ?? [];
  }

  async getUser(id: string): Promise<SystemUser | null> {
    try {
      return await apiCall(`/users/${id}`);
    } catch {
      return null;
    }
  }

  async addUser(user: Omit<SystemUser, 'id' | 'createdAt'>): Promise<SystemUser> {
    const newUser = { ...user, id: Date.now().toString(), createdAt: new Date().toISOString() };
    const saved = await apiCall('/users', 'POST', newUser);
    // Link user to employee if employeeId provided
    if (newUser.employeeId) {
      try {
        await apiCall(`/employees/${newUser.employeeId}`, 'PUT', { userId: newUser.id });
      } catch {
        // Non-fatal: employee linking is best-effort
      }
    }
    return saved;
  }

  async updateUser(id: string, updates: Partial<SystemUser>): Promise<SystemUser> {
    return await apiCall(`/users/${id}`, 'PUT', updates);
  }

  async deleteUser(id: string): Promise<void> {
    await apiCall(`/users/${id}`, 'DELETE');
  }

  // Project Manpower
  async getProjectManpower(projectId: string): Promise<ProjectManpower | null> {
    const all: ProjectManpower[] = (await apiCall('/projectManpower')) ?? [];
    return all.find((pm) => pm.projectId === projectId) ?? null;
  }

  async addProjectManpower(manpower: Omit<ProjectManpower, 'id' | 'createdAt'>): Promise<ProjectManpower> {
    const newManpower = { ...manpower, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/projectManpower', 'POST', newManpower);
  }

  async updateProjectManpower(id: string, updates: Partial<ProjectManpower>): Promise<ProjectManpower> {
    return await apiCall(`/projectManpower/${id}`, 'PUT', updates);
  }

  async deleteProjectManpower(id: string): Promise<void> {
    await apiCall(`/projectManpower/${id}`, 'DELETE');
  }

  // Manpower Members
  async getManpowerMembers(projectId: string): Promise<ManpowerMember[]> {
    const all: ManpowerMember[] = (await apiCall('/manpowerMembers')) ?? [];
    return all.filter((m) => m.projectId === projectId);
  }

  async addManpowerMember(member: Omit<ManpowerMember, 'id' | 'createdAt'>): Promise<ManpowerMember> {
    const newMember = { ...member, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/manpowerMembers', 'POST', newMember);
  }

  async updateManpowerMember(id: string, updates: Partial<ManpowerMember>): Promise<ManpowerMember> {
    return await apiCall(`/manpowerMembers/${id}`, 'PUT', updates);
  }

  async deleteManpowerMember(id: string): Promise<void> {
    await apiCall(`/manpowerMembers/${id}`, 'DELETE');
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return (await apiCall('/employees')) ?? [];
  }

  async getEmployee(id: string): Promise<Employee | null> {
    try {
      return await apiCall(`/employees/${id}`);
    } catch {
      return null;
    }
  }

  async addEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'employeeId'>): Promise<Employee> {
    const employeeId = numberGenerator.generateNumber('employee');
    const newEmployee = { ...employee, employeeId, id: Date.now().toString(), createdAt: new Date().toISOString() };
    return await apiCall('/employees', 'POST', newEmployee);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    return await apiCall(`/employees/${id}`, 'PUT', { ...updates, updatedAt: new Date().toISOString() });
  }

  async deleteEmployee(id: string): Promise<void> {
    await apiCall(`/employees/${id}`, 'DELETE');
  }

  // Budget Categories
  private readonly defaultCategories: string[] = [
    'Fitout',
    'Construction',
    'Electrical',
    'Plumbing',
    'HVAC',
    'IT/Low-Current',
    'Furniture (FF&E)',
    'Landscaping',
    'Manpower',
    'Other',
  ];

  async getBudgetCategories(): Promise<string[]> {
    try {
      const categories = await apiCall('/budgetCategories');
      return categories ?? [...this.defaultCategories];
    } catch {
      return [...this.defaultCategories];
    }
  }

  async saveBudgetCategories(categories: string[]): Promise<void> {
    await apiCall('/budgetCategories', 'PUT', { categories });
  }

  async addBudgetCategory(category: string): Promise<boolean> {
    const categories = await this.getBudgetCategories();
    if (!categories.includes(category)) {
      categories.push(category);
      await this.saveBudgetCategories(categories);
      return true;
    }
    return false;
  }

  async removeBudgetCategory(category: string): Promise<boolean> {
    const categories = await this.getBudgetCategories();
    const filtered = categories.filter((c) => c !== category);
    if (filtered.length !== categories.length) {
      await this.saveBudgetCategories(filtered);
      return true;
    }
    return false;
  }

  async updateBudgetCategory(oldCategory: string, newCategory: string): Promise<boolean> {
    const categories = await this.getBudgetCategories();
    const index = categories.indexOf(oldCategory);
    if (index !== -1 && !categories.includes(newCategory)) {
      categories[index] = newCategory;
      await this.saveBudgetCategories(categories);
      return true;
    }
    return false;
  }
}

export const dataStore = new DataStore();
