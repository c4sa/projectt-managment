// Environment loaded via --env-file=.env.local in the npm script
import express from 'express';
import cors from 'cors';

// Import all API handlers
import healthHandler from './api/health.js';
import projectsHandler from './api/projects.js';
import customersHandler from './api/customers.js';
import vendorsHandler from './api/vendors.js';
import usersHandler from './api/users.js';
import employeesHandler from './api/employees.js';
import purchaseOrdersHandler from './api/purchase-orders.js';
import tasksHandler from './api/tasks.js';
import taskGroupsHandler from './api/taskGroups.js';
import budgetItemsHandler from './api/budgetItems.js';
import budgetCategoriesHandler from './api/budgetCategories.js';
import variationOrdersHandler from './api/variationOrders.js';
import vendorInvoicesHandler from './api/vendorInvoices.js';
import vendorClaimsHandler from './api/vendorClaims.js';
import customerInvoicesHandler from './api/customerInvoices.js';
import paymentRequestsHandler from './api/paymentRequests.js';
import paymentsHandler from './api/payments.js';
import projectManpowerHandler from './api/projectManpower.js';
import manpowerMembersHandler from './api/manpowerMembers.js';
import printTemplatesHandler from './api/printTemplates.js';
import documentsHandler from './api/documents.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Mount handlers — each one handles GET (list), GET /:id, POST, PUT /:id, DELETE /:id
function mount(app, path, handler) {
  app.all(path, handler);
  app.all(`${path}/:id`, handler);
}

app.get('/api/health', healthHandler);

mount(app, '/api/projects', projectsHandler);
mount(app, '/api/customers', customersHandler);
mount(app, '/api/vendors', vendorsHandler);
mount(app, '/api/users', usersHandler);
mount(app, '/api/employees', employeesHandler);
mount(app, '/api/purchase-orders', purchaseOrdersHandler);
mount(app, '/api/tasks', tasksHandler);
mount(app, '/api/taskGroups', taskGroupsHandler);
mount(app, '/api/budgetItems', budgetItemsHandler);
mount(app, '/api/variationOrders', variationOrdersHandler);
mount(app, '/api/vendorInvoices', vendorInvoicesHandler);
mount(app, '/api/vendorClaims', vendorClaimsHandler);
mount(app, '/api/customerInvoices', customerInvoicesHandler);
mount(app, '/api/paymentRequests', paymentRequestsHandler);
mount(app, '/api/payments', paymentsHandler);
mount(app, '/api/projectManpower', projectManpowerHandler);
mount(app, '/api/manpowerMembers', manpowerMembersHandler);
mount(app, '/api/printTemplates', printTemplatesHandler);
mount(app, '/api/documents', documentsHandler);

// Budget categories: GET /api/budgetCategories, PUT /api/budgetCategories
app.all('/api/budgetCategories', budgetCategoriesHandler);

app.listen(PORT, () => {
  console.log(`Core Code API server running on http://localhost:${PORT}`);
});
