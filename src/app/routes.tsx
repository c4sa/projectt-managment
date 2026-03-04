import { createBrowserRouter } from 'react-router';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { VendorsPage } from './pages/VendorsPage';
import { VendorDetailPage } from './pages/VendorDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/forgot-password',
    Component: ForgotPasswordPage,
  },
  {
    path: '/set-password',
    Component: SetPasswordPage,
  },
  {
    path: '/',
    Component: MainLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'projects', Component: ProjectsPage },
      { path: 'projects/:id', Component: ProjectDetailPage },
      { path: 'vendors', Component: VendorsPage },
      { path: 'vendors/:id', Component: VendorDetailPage },
      { path: 'customers', Component: CustomersPage },
      { path: 'customers/:id', Component: CustomerDetailPage },
      { path: 'purchase-orders', Component: PurchaseOrdersPage },
      { path: 'invoices', Component: InvoicesPage },
      { path: 'payments', Component: PaymentsPage },
      { path: 'reports', Component: ReportsPage },
      { path: 'users', Component: UsersPage },
      { path: 'employees', Component: EmployeesPage },
      { path: 'settings', Component: SettingsPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);