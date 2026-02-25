// This file contains the data store and types for all modules
// In production, this would be replaced with API calls to your backend

import { numberGenerator } from '../utils/numberGenerator';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-02fd4b7a`;

// Helper function for API calls
async function apiCall(endpoint: string, method: string = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    
    // If 404, return null (endpoint doesn't exist yet)
    if (response.status === 404) {
      return null;
    }
    
    // Handle empty responses (like DELETE operations)
    const text = await response.text();
    if (!text || text.trim() === '') {
      if (!response.ok) {
        throw new Error(`API call failed with status ${response.status}`);
      }
      return null;
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // If it's not JSON, it might be an HTML error page
      if (method !== 'GET') {
        console.warn(`Non-JSON response from ${endpoint}:`, text.substring(0, 100));
      }
      return null;
    }
    
    if (!data.success) {
      throw new Error(data.error || 'API call failed');
    }
    
    return data.data;
  } catch (error) {
    // Only log warnings for write operations (POST, PUT, DELETE)
    // GET requests silently fall back to localStorage
    if (method !== 'GET') {
      console.warn(`API call to ${endpoint} failed:`, error);
    }
    return null;
  }
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
export type BudgetCategory = string; // Changed to string to allow dynamic categories

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
  idNumber?: string; // Iqama/National ID
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
  vatStatus?: 'not_applicable' | 'inclusive' | 'exclusive'; // Changed from vatInclusive boolean
  contractDocument?: string; // URL or path to contract
  contractLink?: string; // Link to cloud storage
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
  reserved: number; // Amount reserved by approved POs
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
  invoiceDate?: string; // Alternative field name used by component
  description?: string; // Added for component compatibility
  dueDate: string;
  paymentDate?: string;
  items: POLineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  vat?: number; // Alternative field name used by component
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
  amountPaid?: number; // Track amount paid through payments
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
  employeeId?: string; // Link to employee
}

export interface Employee {
  id: string;
  employeeId: string; // Auto-generated employee number
  name: string;
  email?: string;
  phone?: string;
  nationality?: string;
  idNumber?: string; // Iqama/National ID
  passportNumber?: string;
  department?: string;
  position?: string;
  assignedRole?: string; // Project Manager, Site Engineer, etc.
  joiningDate?: string;
  bankName?: string;
  iban?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'on_leave';
  userId?: string; // Link to system user
  createdAt: string;
  updatedAt?: string;
}

// Mock Data Store
class DataStore {
  private projects: Project[] = [];
  private customers: Customer[] = [];
  private vendors: Vendor[] = [];
  private tasks: Task[] = [];
  private taskGroups: TaskGroup[] = [];
  private budgetItems: BudgetItem[] = [];
  private purchaseOrders: PurchaseOrder[] = [];
  private variationOrders: VariationOrder[] = [];
  private vendorInvoices: VendorInvoice[] = [];
  private vendorClaims: VendorClaim[] = [];
  private customerInvoices: CustomerInvoice[] = [];
  private paymentRequests: PaymentRequest[] = [];
  private payments: Payment[] = [];
  private documents: Document[] = [];
  private printTemplates: PrintTemplate[] = [];
  private users: SystemUser[] = [];
  private projectManpower: ProjectManpower[] = [];
  private manpowerMembers: ManpowerMember[] = [];
  private employees: Employee[] = [];

  constructor() {
    this.loadFromLocalStorage();
    // Also sync from database
    this.syncFromDatabase();
    if (this.projects.length === 0) {
      this.initializeMockData();
      this.saveToLocalStorage();
    }
  }

  private async syncFromDatabase() {
    try {
      const projects = await apiCall('/projects');
      if (projects && projects.length > 0) {
        this.projects = projects;
        this.saveToLocalStorage();
      }
    } catch (error) {
      // Database not available, use localStorage
      console.log('Using localStorage (database not available)');
    }

    try {
      const customers = await apiCall('/customers');
      if (customers && customers.length > 0) {
        this.customers = customers;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for customers');
    }

    try {
      const vendors = await apiCall('/vendors');
      if (vendors && vendors.length > 0) {
        this.vendors = vendors;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for vendors');
    }

    try {
      const users = await apiCall('/users');
      if (users && users.length > 0) {
        this.users = users;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for users');
    }

    // Sync financial data
    try {
      const pos = await apiCall('/purchase-orders');
      if (pos && pos.length > 0) {
        this.purchaseOrders = pos;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for purchase orders');
    }

    try {
      const vendorInvoices = await apiCall('/vendorInvoices');
      if (vendorInvoices && vendorInvoices.length > 0) {
        this.vendorInvoices = vendorInvoices;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for vendor invoices');
    }

    try {
      const customerInvoices = await apiCall('/customerInvoices');
      if (customerInvoices && customerInvoices.length > 0) {
        this.customerInvoices = customerInvoices;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for customer invoices');
    }

    try {
      const payments = await apiCall('/payments');
      if (payments && payments.length > 0) {
        this.payments = payments;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for payments');
    }

    // Sync employees
    try {
      const employees = await apiCall('/employees');
      if (employees && employees.length > 0) {
        this.employees = employees;
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.log('Using localStorage for employees');
    }
  }

  private saveToLocalStorage() {
    const data = {
      projects: this.projects,
      customers: this.customers,
      vendors: this.vendors,
      tasks: this.tasks,
      taskGroups: this.taskGroups,
      budgetItems: this.budgetItems,
      purchaseOrders: this.purchaseOrders,
      variationOrders: this.variationOrders,
      vendorInvoices: this.vendorInvoices,
      vendorClaims: this.vendorClaims,
      customerInvoices: this.customerInvoices,
      paymentRequests: this.paymentRequests,
      payments: this.payments,
      documents: this.documents,
      printTemplates: this.printTemplates,
      users: this.users,
      projectManpower: this.projectManpower,
      manpowerMembers: this.manpowerMembers,
      employees: this.employees,
    };
    localStorage.setItem('core_code_data', JSON.stringify(data));
  }

  private loadFromLocalStorage() {
    const data = localStorage.getItem('core_code_data');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.projects = parsed.projects || [];
        this.customers = parsed.customers || [];
        this.vendors = parsed.vendors || [];
        this.tasks = parsed.tasks || [];
        this.taskGroups = parsed.taskGroups || [];
        this.budgetItems = (parsed.budgetItems || []).map((item: any) => ({
          ...item,
          reserved: item.reserved || 0, // Initialize reserved if missing
        }));
        this.purchaseOrders = parsed.purchaseOrders || [];
        this.variationOrders = parsed.variationOrders || [];
        this.vendorInvoices = parsed.vendorInvoices || [];
        this.vendorClaims = parsed.vendorClaims || [];
        this.customerInvoices = parsed.customerInvoices || [];
        this.paymentRequests = parsed.paymentRequests || [];
        this.payments = parsed.payments || [];
        this.documents = parsed.documents || [];
        this.printTemplates = parsed.printTemplates || [];
        this.users = parsed.users || [];
        this.projectManpower = parsed.projectManpower || [];
        this.manpowerMembers = parsed.manpowerMembers || [];
        this.employees = parsed.employees || [];
      } catch (e) {
        console.error('Failed to parse stored data');
      }
    }
  }

  private async saveToDatabase() {
    // Save critical data to database in background
    this.saveToLocalStorage(); // Always save to localStorage first
  }

  private async initializeMockData() {
    // Check if data already exists in database
    const existingProjects = await apiCall('/projects');
    if (existingProjects && existingProjects.length > 0) {
      return; // Data already initialized
    }

    // Initialize with sample data
    const customer = {
      id: '1',
      code: 'CUST-001',
      name: 'Saudi Construction Company',
      email: 'contact@saudiconstruction.sa',
      phone: '+966 11 234 5678',
      vatNumber: '300123456700003',
      contactPerson: 'Ahmed Al-Rashid',
      address: 'Riyadh, Saudi Arabia',
      createdAt: new Date().toISOString(),
    };
    await apiCall('/customers', 'POST', customer);

    const vendor = {
      id: '1',
      code: 'VEND-001',
      name: 'Al-Khaled MEP Contractors',
      email: 'info@alkhaledmep.sa',
      phone: '+966 11 345 6789',
      bankName: 'Al Rajhi Bank',
      iban: 'SA1234567890123456789012',
      vatNumber: '300987654300003',
      specialty: 'MEP',
      contactPerson: 'Mohammed Al-Khaled',
      createdAt: new Date().toISOString(),
    };
    await apiCall('/vendors', 'POST', vendor);

    const project = {
      id: '1',
      name: 'Riyadh Office Tower',
      code: 'ROT-2026-001',
      status: 'active',
      customerId: '1',
      projectManager: '1',
      teamMembers: ['1', '2'],
      startDate: '2026-01-15',
      endDate: '2026-12-31',
      description: 'Construction of 20-story office building in Riyadh',
      location: 'King Fahd Road, Riyadh',
      budget: 50000000,
      spent: 12500000,
      contractValue: 55000000,
      vatStatus: 'inclusive',
      contractDocument: 'https://example.com/contracts/ROT-2026-001.pdf',
      contractLink: 'https://cloudstorage.com/contracts/ROT-2026-001.pdf',
      createdAt: new Date().toISOString(),
    };
    await apiCall('/projects', 'POST', project);

    const user = {
      id: '1',
      name: 'Admin User',
      email: 'admin@corecode.sa',
      role: 'admin',
      phone: '+966 50 123 4567',
      department: 'Management',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    await apiCall('/users', 'POST', user);

    const template = {
      id: '1',
      name: 'Default Purchase Order Template',
      type: 'purchase_order',
      headerColor: '#7A1516',
      fontFamily: 'Almarai',
      header: 'Core Code Construction',
      footer: 'Thank you for your business',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 20,
      marginRight: 20,
      isDefault: true,
      createdAt: new Date().toISOString(),
    };
    await apiCall('/print-templates', 'POST', template);
  }

  // Projects
  async getProjects() {
    try {
      const projects = await apiCall('/projects');
      return projects || [];
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }
  
  async getProjectAsync(id: string) {
    try {
      const projects = await this.getProjects();
      return projects.find((p: Project) => p.id === id) || null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }
  
  async addProject(project: Omit<Project, 'id' | 'createdAt' | 'code'>) {
    const code = numberGenerator.generateNumber('project');
    const newProject = { ...project, code, id: Date.now().toString(), createdAt: new Date().toISOString() };
    try {
      return await apiCall('/projects', 'POST', newProject);
    } catch (error) {
      console.error('Error adding project:', error);
      return newProject;
    }
  }
  
  async updateProject(id: string, updates: Partial<Project>) {
    try {
      return await apiCall(`/projects/${id}`, 'PUT', updates);
    } catch (error) {
      console.error('Error updating project:', error);
      return null;
    }
  }
  
  async deleteProject(id: string) {
    try {
      await apiCall(`/projects/${id}`, 'DELETE');
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }

  // Customers
  async getCustomers() {
    try {
      const customers = await apiCall('/customers');
      return customers || [];
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  }
  
  async getCustomer(id: string) {
    try {
      return await apiCall(`/customers/${id}`);
    } catch (error: any) {
      // Silently return null if customer not found (expected case)
      if (error.message?.includes('Customer not found')) {
        return null;
      }
      console.error('Error getting customer:', error);
      return null;
    }
  }
  
  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'code'>) {
    const code = numberGenerator.generateNumber('customer');
    const newCustomer = { ...customer, id: Date.now().toString(), code, createdAt: new Date().toISOString() };
    try {
      return await apiCall('/customers', 'POST', newCustomer);
    } catch (error) {
      console.error('Error adding customer:', error);
      return newCustomer;
    }
  }
  
  async updateCustomer(id: string, updates: Partial<Customer>) {
    try {
      return await apiCall(`/customers/${id}`, 'PUT', updates);
    } catch (error) {
      console.error('Error updating customer:', error);
      return null;
    }
  }
  
  async deleteCustomer(id: string) {
    try {
      await apiCall(`/customers/${id}`, 'DELETE');
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  }

  // Vendors
  async getVendors() {
    try {
      const vendors = await apiCall('/vendors');
      return vendors || [];
    } catch (error) {
      console.error('Error getting vendors:', error);
      // Fallback to localStorage
      return [...this.vendors];
    }
  }
  
  async getVendor(id: string) {
    try {
      const vendors = await this.getVendors();
      return vendors.find((v: Vendor) => v.id === id) || null;
    } catch (error) {
      console.error('Error getting vendor:', error);
      return null;
    }
  }
  
  async addVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'code'>) {
    const code = numberGenerator.generateNumber('vendor');
    const id = Date.now().toString();
    const newVendor = { ...vendor, id, code, createdAt: new Date().toISOString() };
    try {
      return await apiCall('/vendors', 'POST', newVendor);
    } catch (error) {
      console.error('Error adding vendor:', error);
      return newVendor;
    }
  }
  
  async updateVendor(id: string, updates: Partial<Vendor>) {
    try {
      return await apiCall(`/vendors/${id}`, 'PUT', updates);
    } catch (error) {
      console.error('Error updating vendor:', error);
      return null;
    }
  }
  
  async deleteVendor(id: string) {
    try {
      await apiCall(`/vendors/${id}`, 'DELETE');
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  }

  // Tasks
  getTasks(projectId?: string) {
    return projectId ? this.tasks.filter(t => t.projectId === projectId) : [...this.tasks];
  }
  getTask(id: string) { return this.tasks.find(t => t.id === id); }
  addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.push(newTask);
    this.saveToLocalStorage();
    return newTask;
  }
  updateTask(id: string, updates: Partial<Task>) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tasks[index] = { ...this.tasks[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToLocalStorage();
      return this.tasks[index];
    }
  }
  deleteTask(id: string) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveToLocalStorage();
  }

  // Task Groups
  getTaskGroups(projectId: string) {
    return this.taskGroups.filter(g => g.projectId === projectId);
  }
  addTaskGroup(group: Omit<TaskGroup, 'id'>) {
    const newGroup = { ...group, id: Date.now().toString() };
    this.taskGroups.push(newGroup);
    this.saveToLocalStorage();
    return newGroup;
  }
  updateTaskGroup(id: string, updates: Partial<TaskGroup>) {
    const index = this.taskGroups.findIndex(g => g.id === id);
    if (index !== -1) {
      this.taskGroups[index] = { ...this.taskGroups[index], ...updates };
      this.saveToLocalStorage();
      return this.taskGroups[index];
    }
  }
  deleteTaskGroup(id: string) {
    this.taskGroups = this.taskGroups.filter(g => g.id !== id);
    this.saveToLocalStorage();
  }

  // Budget Items
  getBudgetItems(projectId: string) {
    return this.budgetItems.filter(b => b.projectId === projectId);
  }
  addBudgetItem(item: Omit<BudgetItem, 'id' | 'createdAt'>) {
    const newItem = { ...item, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.budgetItems.push(newItem);
    this.saveToLocalStorage();
    return newItem;
  }
  updateBudgetItem(id: string, updates: Partial<BudgetItem>) {
    const index = this.budgetItems.findIndex(b => b.id === id);
    if (index !== -1) {
      this.budgetItems[index] = { ...this.budgetItems[index], ...updates };
      this.saveToLocalStorage();
      return this.budgetItems[index];
    }
  }
  deleteBudgetItem(id: string) {
    // Check if budget item is referenced by any PO, invoice, or payment
    const budgetItem = this.budgetItems.find(b => b.id === id);
    if (!budgetItem) {
      throw new Error('Budget item not found');
    }

    const itemIdentifier = `${budgetItem.category}-${budgetItem.name}`;

    // Check POs for references (both at PO level and line item level)
    const referencedInPO = this.purchaseOrders.some(po => {
      // Check PO-level category
      if (po.budgetCategory === budgetItem.category) {
        return true;
      }
      // Check line items for budgetCategory or budgetItem references
      if (po.items && Array.isArray(po.items)) {
        return po.items.some((item: any) => 
          item.budgetCategory === budgetItem.category || 
          item.budgetItem === itemIdentifier
        );
      }
      return false;
    });

    if (referencedInPO) {
      throw new Error(`Cannot delete budget item "${budgetItem.name}" because it is referenced by one or more Purchase Orders.`);
    }

    // Check vendor invoices for references
    const referencedInInvoice = this.vendorInvoices.some(invoice => {
      // Check invoice-level category
      if (invoice.budgetCategory === budgetItem.category) {
        return true;
      }
      // Check line items for budgetCategory or budgetItem references
      if (invoice.items && Array.isArray(invoice.items)) {
        return invoice.items.some((item: any) => 
          item.budgetCategory === budgetItem.category || 
          item.budgetItem === itemIdentifier
        );
      }
      return false;
    });

    if (referencedInInvoice) {
      throw new Error(`Cannot delete budget item "${budgetItem.name}" because it is referenced by one or more Invoices.`);
    }

    // Check payments for references
    const referencedInPayment = this.payments.some(payment => 
      payment.budgetCategory === budgetItem.category
    );

    if (referencedInPayment) {
      throw new Error(`Cannot delete budget item "${budgetItem.name}" because it is referenced by one or more Payments.`);
    }

    // If no references found, proceed with deletion
    this.budgetItems = this.budgetItems.filter(b => b.id !== id);
    this.saveToLocalStorage();
  }

  // Update budget reserved amounts based on PO categories
  async updateBudgetReserved(projectId: string, po: any, isApproving: boolean) {
    const budgetItems = this.getBudgetItems(projectId);
    
    // Get categories from PO items or use PO-level category
    const hasItemCategories = po.items && po.items.some((item: any) => item.budgetCategory);
    
    if (hasItemCategories) {
      // Update each category based on line items
      const categoryTotals: { [key: string]: number } = {}; 
      
      po.items.forEach((item: any) => {
        const category = item.budgetCategory || po.budgetCategory;
        if (category) {
          categoryTotals[category] = (categoryTotals[category] || 0) + item.total;
        }
      });
      
      // Update each affected budget category
      for (const [category, amount] of Object.entries(categoryTotals)) {
        const budgetItem = budgetItems.find(b => b.category === category);
        if (budgetItem) {
          const currentReserved = budgetItem.reserved || 0;
          const newReserved = isApproving 
            ? currentReserved + amount 
            : Math.max(0, currentReserved - amount);
          
          this.updateBudgetItem(budgetItem.id, { reserved: newReserved });
        }
      }
    } else if (po.budgetCategory) {
      // Update single budget category
      const budgetItem = budgetItems.find(b => b.category === po.budgetCategory);
      if (budgetItem) {
        const currentReserved = budgetItem.reserved || 0;
        const subtotal = po.subtotal || 0;
        const newReserved = isApproving 
          ? currentReserved + subtotal 
          : Math.max(0, currentReserved - subtotal);
        
        this.updateBudgetItem(budgetItem.id, { reserved: newReserved });
      }
    }
  }

  // Update budget actual amounts when payment is marked as paid
  async updateBudgetActual(projectId: string, po: any, payment: any) {
    const budgetItems = this.getBudgetItems(projectId);
    
    // Get categories from PO items or use PO-level category
    const hasItemCategories = po.items && po.items.some((item: any) => item.budgetCategory);
    
    if (hasItemCategories && payment.lineItemPayments) {
      // Update each category based on line item payments
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
      
      // Update each affected budget category
      for (const [category, amount] of Object.entries(categoryTotals)) {
        const budgetItem = budgetItems.find(b => b.category === category);
        if (budgetItem) {
          const currentActual = budgetItem.actual || 0;
          const newActual = currentActual + amount;
          this.updateBudgetItem(budgetItem.id, { actual: newActual });
        }
      }
    } else if (po.budgetCategory) {
      // Update single budget category
      const budgetItem = budgetItems.find(b => b.category === po.budgetCategory);
      if (budgetItem) {
        const currentActual = budgetItem.actual || 0;
        const subtotal = payment.subtotal || payment.amount || 0;
        const newActual = currentActual + subtotal;
        this.updateBudgetItem(budgetItem.id, { actual: newActual });
      }
    }
  }

  // Purchase Orders
  async getPurchaseOrders(projectId?: string) {
    // Direct localStorage access - no API call needed
    const allPOs = [...this.purchaseOrders];
    return projectId ? allPOs.filter((po: PurchaseOrder) => po.projectId === projectId) : allPOs;
  }
  
  getPurchaseOrdersSync(projectId?: string) {
    return projectId ? this.purchaseOrders.filter(po => po.projectId === projectId) : [...this.purchaseOrders];
  }
  
  getPurchaseOrder(id: string) { return this.purchaseOrders.find(po => po.id === id); }
  
  async addPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>) {
    const poNumber = numberGenerator.generateNumber('purchaseOrder');
    const newPO = { ...po, poNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    try {
      const saved = await apiCall('/purchase-orders', 'POST', newPO);
      this.purchaseOrders.push(saved);
      this.saveToLocalStorage();
      return saved;
    } catch (error) {
      console.error('Error adding purchase order:', error);
      this.purchaseOrders.push(newPO);
      this.saveToLocalStorage();
      return newPO;
    }
  }
  
  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>) {
    try {
      const updated = await apiCall(`/purchase-orders/${id}`, 'PUT', updates);
      const index = this.purchaseOrders.findIndex(po => po.id === id);
      if (index !== -1) {
        this.purchaseOrders[index] = updated;
        this.saveToLocalStorage();
      }
      return updated;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      const index = this.purchaseOrders.findIndex(po => po.id === id);
      if (index !== -1) {
        this.purchaseOrders[index] = { ...this.purchaseOrders[index], ...updates };
        this.saveToLocalStorage();
        return this.purchaseOrders[index];
      }
    }
  }
  
  async deletePurchaseOrder(id: string) {
    console.log('Deleting PO with ID:', id);
    try {
      await apiCall(`/purchase-orders/${id}`, 'DELETE');
      const initialLength = this.purchaseOrders.length;
      this.purchaseOrders = this.purchaseOrders.filter(po => po.id !== id);
      const finalLength = this.purchaseOrders.length;
      console.log(`POs before delete: ${initialLength}, after delete: ${finalLength}`);
      this.saveToLocalStorage();
      return true;
    } catch (error) {
      console.error('Error deleting purchase order from backend:', error);
      // Still delete locally even if backend call fails
      const initialLength = this.purchaseOrders.length;
      this.purchaseOrders = this.purchaseOrders.filter(po => po.id !== id);
      const finalLength = this.purchaseOrders.length;
      console.log(`POs before delete: ${initialLength}, after delete: ${finalLength}`);
      this.saveToLocalStorage();
      return true;
    }
  }

  // Variation Orders
  getVariationOrders(poId?: string) {
    return poId ? this.variationOrders.filter(vo => vo.poId === poId) : [...this.variationOrders];
  }
  addVariationOrder(vo: Omit<VariationOrder, 'id' | 'createdAt' | 'voNumber'>) {
    const voNumber = numberGenerator.generateNumber('variationOrder');
    const newVO = { ...vo, voNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.variationOrders.push(newVO);
    this.saveToLocalStorage();
    return newVO;
  }
  updateVariationOrder(id: string, updates: Partial<VariationOrder>) {
    const index = this.variationOrders.findIndex(vo => vo.id === id);
    if (index !== -1) {
      this.variationOrders[index] = { ...this.variationOrders[index], ...updates };
      this.saveToLocalStorage();
      return this.variationOrders[index];
    }
  }

  // Vendor Invoices
  async getVendorInvoices(vendorId?: string) {
    try {
      const invoices = await apiCall('/vendorInvoices');
      const allInvoices = invoices || [];
      return vendorId ? allInvoices.filter((i: VendorInvoice) => i.vendorId === vendorId) : allInvoices;
    } catch (error) {
      console.error('Error getting vendor invoices:', error);
      // Fallback to localStorage
      return vendorId ? this.vendorInvoices.filter(i => i.vendorId === vendorId) : [...this.vendorInvoices];
    }
  }
  
  getVendorInvoicesSync(vendorId?: string) {
    return vendorId ? this.vendorInvoices.filter(i => i.vendorId === vendorId) : [...this.vendorInvoices];
  }
  
  async addVendorInvoice(invoice: Omit<VendorInvoice, 'id' | 'createdAt' | 'invoiceNumber'>) {
    const invoiceNumber = numberGenerator.generateNumber('invoice');
    const newInvoice = { ...invoice, invoiceNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    try {
      const saved = await apiCall('/vendorInvoices', 'POST', newInvoice);
      this.vendorInvoices.push(saved);
      this.saveToLocalStorage();
      return saved;
    } catch (error) {
      console.error('Error adding vendor invoice:', error);
      this.vendorInvoices.push(newInvoice);
      this.saveToLocalStorage();
      return newInvoice;
    }
  }
  
  async updateVendorInvoice(id: string, updates: Partial<VendorInvoice>) {
    try {
      const updated = await apiCall(`/vendorInvoices/${id}`, 'PUT', updates);
      const index = this.vendorInvoices.findIndex(i => i.id === id);
      if (index !== -1) {
        this.vendorInvoices[index] = updated;
        this.saveToLocalStorage();
      }
      return updated;
    } catch (error) {
      console.error('Error updating vendor invoice:', error);
      const index = this.vendorInvoices.findIndex(i => i.id === id);
      if (index !== -1) {
        this.vendorInvoices[index] = { ...this.vendorInvoices[index], ...updates };
        this.saveToLocalStorage();
        return this.vendorInvoices[index];
      }
    }
  }

  deleteVendorInvoice(id: string) {
    this.vendorInvoices = this.vendorInvoices.filter(i => i.id !== id);
    this.saveToLocalStorage();
  }

  // Vendor Claims
  getVendorClaims(vendorId?: string) {
    return vendorId ? this.vendorClaims.filter(c => c.vendorId === vendorId) : [...this.vendorClaims];
  }
  addVendorClaim(claim: Omit<VendorClaim, 'id' | 'createdAt' | 'claimNumber'>) {
    const claimNumber = numberGenerator.generateNumber('claim');
    const newClaim = { ...claim, claimNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.vendorClaims.push(newClaim);
    this.saveToLocalStorage();
    return newClaim;
  }
  updateVendorClaim(id: string, updates: Partial<VendorClaim>) {
    const index = this.vendorClaims.findIndex(c => c.id === id);
    if (index !== -1) {
      this.vendorClaims[index] = { ...this.vendorClaims[index], ...updates };
      this.saveToLocalStorage();
      return this.vendorClaims[index];
    }
  }

  // Customer Invoices
  async getCustomerInvoices(customerId?: string) {
    try {
      const invoices = await apiCall('/customerInvoices');
      const allInvoices = invoices || [];
      return customerId ? allInvoices.filter((i: CustomerInvoice) => i.customerId === customerId) : allInvoices;
    } catch (error) {
      console.error('Error getting customer invoices:', error);
      // Fallback to localStorage
      return customerId ? this.customerInvoices.filter(i => i.customerId === customerId) : [...this.customerInvoices];
    }
  }
  
  getCustomerInvoicesSync(customerId?: string) {
    return customerId ? this.customerInvoices.filter(i => i.customerId === customerId) : [...this.customerInvoices];
  }
  
  async addCustomerInvoice(invoice: Omit<CustomerInvoice, 'id' | 'createdAt' | 'invoiceNumber'>) {
    const invoiceNumber = numberGenerator.generateNumber('invoice');
    const newInvoice = { ...invoice, invoiceNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    try {
      const saved = await apiCall('/customerInvoices', 'POST', newInvoice);
      this.customerInvoices.push(saved);
      this.saveToLocalStorage();
      return saved;
    } catch (error) {
      console.error('Error adding customer invoice:', error);
      this.customerInvoices.push(newInvoice);
      this.saveToLocalStorage();
      return newInvoice;
    }
  }
  
  async updateCustomerInvoice(id: string, updates: Partial<CustomerInvoice>) {
    try {
      const updated = await apiCall(`/customerInvoices/${id}`, 'PUT', updates);
      const index = this.customerInvoices.findIndex(i => i.id === id);
      if (index !== -1) {
        this.customerInvoices[index] = updated;
        this.saveToLocalStorage();
      }
      return updated;
    } catch (error) {
      console.error('Error updating customer invoice:', error);
      const index = this.customerInvoices.findIndex(i => i.id === id);
      if (index !== -1) {
        this.customerInvoices[index] = { ...this.customerInvoices[index], ...updates };
        this.saveToLocalStorage();
        return this.customerInvoices[index];
      }
    }
  }

  // Payment Requests
  getPaymentRequests() { return [...this.paymentRequests]; }
  addPaymentRequest(request: Omit<PaymentRequest, 'id' | 'createdAt' | 'requestNumber'>) {
    const requestNumber = numberGenerator.generateNumber('payment');
    const newRequest = { ...request, requestNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.paymentRequests.push(newRequest);
    this.saveToLocalStorage();
    return newRequest;
  }
  updatePaymentRequest(id: string, updates: Partial<PaymentRequest>) {
    const index = this.paymentRequests.findIndex(r => r.id === id);
    if (index !== -1) {
      this.paymentRequests[index] = { ...this.paymentRequests[index], ...updates };
      this.saveToLocalStorage();
      return this.paymentRequests[index];
    }
  }

  // Payments
  getPayments(projectId?: string) {
    return projectId ? this.payments.filter(p => p.projectId === projectId) : [...this.payments];
  }
  generatePaymentNumber() {
    return Promise.resolve(numberGenerator.previewNextNumber('payment'));
  }
  addPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'paymentNumber'>) {
    const paymentNumber = numberGenerator.generateNumber('payment');
    const newPayment = { ...payment, paymentNumber, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.payments.push(newPayment);
    this.saveToLocalStorage();
    return newPayment;
  }
  updatePayment(id: string, updates: Partial<Payment>) {
    const index = this.payments.findIndex(p => p.id === id);
    if (index !== -1) {
      this.payments[index] = { ...this.payments[index], ...updates };
      this.saveToLocalStorage();
      return this.payments[index];
    }
  }
  
  deletePayment(id: string) {
    this.payments = this.payments.filter(p => p.id !== id);
    this.saveToLocalStorage();
  }

  // Documents
  getDocuments(projectId: string) {
    return this.documents.filter(d => d.projectId === projectId);
  }
  addDocument(doc: Omit<Document, 'id'>) {
    const newDoc = { ...doc, id: Date.now().toString() };
    this.documents.push(newDoc);
    this.saveToLocalStorage();
    return newDoc;
  }
  deleteDocument(id: string) {
    this.documents = this.documents.filter(d => d.id !== id);
    this.saveToLocalStorage();
  }

  // Print Templates
  getPrintTemplates(type?: PrintTemplate['type']) {
    return type ? this.printTemplates.filter(t => t.type === type) : [...this.printTemplates];
  }
  addPrintTemplate(template: Omit<PrintTemplate, 'id' | 'createdAt'>) {
    const newTemplate = { ...template, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.printTemplates.push(newTemplate);
    this.saveToLocalStorage();
    return newTemplate;
  }
  updatePrintTemplate(id: string, updates: Partial<PrintTemplate>) {
    const index = this.printTemplates.findIndex(t => t.id === id);
    if (index !== -1) {
      this.printTemplates[index] = { ...this.printTemplates[index], ...updates };
      this.saveToLocalStorage();
      return this.printTemplates[index];
    }
  }
  setDefaultTemplate(id: string, type: PrintTemplate['type']) {
    this.printTemplates = this.printTemplates.map(t =>
      t.type === type ? { ...t, isDefault: t.id === id } : t
    );
    this.saveToLocalStorage();
  }

  // Users
  getUsers() { return [...this.users]; }
  getUser(id: string) { return this.users.find(u => u.id === id); }
  addUser(user: Omit<SystemUser, 'id' | 'createdAt'>) {
    const newUser = { ...user, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.users.push(newUser);
    
    // Link the user to the employee if employeeId is provided
    if (newUser.employeeId) {
      const employeeIndex = this.employees.findIndex(e => e.id === newUser.employeeId);
      if (employeeIndex !== -1) {
        this.employees[employeeIndex].userId = newUser.id;
      }
    }
    
    this.saveToLocalStorage();
    return newUser;
  }
  updateUser(id: string, updates: Partial<SystemUser>) {
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      this.saveToLocalStorage();
      return this.users[index];
    }
  }
  deleteUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
    this.saveToLocalStorage();
  }

  // Project Manpower
  getProjectManpower(projectId: string) {
    return this.projectManpower.find(pm => pm.projectId === projectId) || null;
  }
  addProjectManpower(manpower: Omit<ProjectManpower, 'id' | 'createdAt'>) {
    const newManpower = { ...manpower, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.projectManpower.push(newManpower);
    this.saveToLocalStorage();
    return newManpower;
  }
  updateProjectManpower(id: string, updates: Partial<ProjectManpower>) {
    const index = this.projectManpower.findIndex(pm => pm.id === id);
    if (index !== -1) {
      this.projectManpower[index] = { ...this.projectManpower[index], ...updates };
      this.saveToLocalStorage();
      return this.projectManpower[index];
    }
  }
  deleteProjectManpower(id: string) {
    this.projectManpower = this.projectManpower.filter(pm => pm.id !== id);
    this.saveToLocalStorage();
  }

  // Manpower Members
  getManpowerMembers(projectId: string) {
    return this.manpowerMembers.filter(m => m.projectId === projectId);
  }
  addManpowerMember(member: Omit<ManpowerMember, 'id' | 'createdAt'>) {
    const newMember = { ...member, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.manpowerMembers.push(newMember);
    this.saveToLocalStorage();
    return newMember;
  }
  updateManpowerMember(id: string, updates: Partial<ManpowerMember>) {
    const index = this.manpowerMembers.findIndex(m => m.id === id);
    if (index !== -1) {
      this.manpowerMembers[index] = { ...this.manpowerMembers[index], ...updates };
      this.saveToLocalStorage();
      return this.manpowerMembers[index];
    }
  }
  deleteManpowerMember(id: string) {
    this.manpowerMembers = this.manpowerMembers.filter(m => m.id !== id);
    this.saveToLocalStorage();
  }

  // Employees
  getEmployees() { return [...this.employees]; }
  getEmployee(id: string) { return this.employees.find(e => e.id === id); }
  addEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'employeeId'>) {
    const employeeId = numberGenerator.generateNumber('employee');
    const newEmployee = { ...employee, employeeId, id: Date.now().toString(), createdAt: new Date().toISOString() };
    this.employees.push(newEmployee);
    this.saveToLocalStorage();
    return newEmployee;
  }
  updateEmployee(id: string, updates: Partial<Employee>) {
    const index = this.employees.findIndex(e => e.id === id);
    if (index !== -1) {
      this.employees[index] = { ...this.employees[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToLocalStorage();
      return this.employees[index];
    }
  }
  deleteEmployee(id: string) {
    this.employees = this.employees.filter(e => e.id !== id);
    this.saveToLocalStorage();
  }

  // Budget Categories
  private defaultCategories: string[] = [
    'Fitout',
    'Construction',
    'Electrical',
    'Plumbing',
    'HVAC',
    'IT/Low-Current',
    'Furniture (FF&E)',
    'Landscaping',
    'Manpower',
    'Other'
  ];

  getBudgetCategories(): string[] {
    const stored = localStorage.getItem('budget_categories');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse budget categories');
      }
    }
    // Initialize with default categories
    this.saveBudgetCategories(this.defaultCategories);
    return [...this.defaultCategories];
  }

  saveBudgetCategories(categories: string[]) {
    localStorage.setItem('budget_categories', JSON.stringify(categories));
  }

  addBudgetCategory(category: string) {
    const categories = this.getBudgetCategories();
    if (!categories.includes(category)) {
      categories.push(category);
      this.saveBudgetCategories(categories);
      return true;
    }
    return false;
  }

  removeBudgetCategory(category: string) {
    const categories = this.getBudgetCategories();
    const filtered = categories.filter(c => c !== category);
    if (filtered.length !== categories.length) {
      this.saveBudgetCategories(filtered);
      return true;
    }
    return false;
  }

  updateBudgetCategory(oldCategory: string, newCategory: string) {
    const categories = this.getBudgetCategories();
    const index = categories.indexOf(oldCategory);
    if (index !== -1 && !categories.includes(newCategory)) {
      categories[index] = newCategory;
      this.saveBudgetCategories(categories);
      return true;
    }
    return false;
  }
}

export const dataStore = new DataStore();