import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-02fd4b7a/health", (c) => {
  return c.json({ status: "ok" });
});

// ========== PROJECTS ==========
app.get("/make-server-02fd4b7a/projects", async (c) => {
  try {
    const projects = await kv.getByPrefix("project:");
    return c.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-02fd4b7a/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const project = await kv.get(`project:${id}`);
    if (!project) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    return c.json({ success: true, data: project });
  } catch (error) {
    console.error("Error fetching project:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/projects", async (c) => {
  try {
    const project = await c.req.json();
    await kv.set(`project:${project.id}`, project);
    return c.json({ success: true, data: project });
  } catch (error) {
    console.error("Error creating project:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put("/make-server-02fd4b7a/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`project:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Project not found" }, 404);
    }
    const updated = { ...existing, ...updates };
    await kv.set(`project:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating project:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete("/make-server-02fd4b7a/projects/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`project:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========== CUSTOMERS ==========
app.get("/make-server-02fd4b7a/customers", async (c) => {
  try {
    const customers = await kv.getByPrefix("customer:");
    return c.json({ success: true, data: customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/make-server-02fd4b7a/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const customer = await kv.get(`customer:${id}`);
    if (!customer) {
      return c.json({ success: false, error: "Customer not found" }, 404);
    }
    return c.json({ success: true, data: customer });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/customers", async (c) => {
  try {
    const customer = await c.req.json();
    await kv.set(`customer:${customer.id}`, customer);
    return c.json({ success: true, data: customer });
  } catch (error) {
    console.error("Error creating customer:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put("/make-server-02fd4b7a/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`customer:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Customer not found" }, 404);
    }
    const updated = { ...existing, ...updates };
    await kv.set(`customer:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating customer:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete("/make-server-02fd4b7a/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`customer:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========== VENDORS ==========
app.get("/make-server-02fd4b7a/vendors", async (c) => {
  try {
    const vendors = await kv.getByPrefix("vendor:");
    return c.json({ success: true, data: vendors });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/vendors", async (c) => {
  try {
    const vendor = await c.req.json();
    await kv.set(`vendor:${vendor.id}`, vendor);
    return c.json({ success: true, data: vendor });
  } catch (error) {
    console.error("Error creating vendor:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put("/make-server-02fd4b7a/vendors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`vendor:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Vendor not found" }, 404);
    }
    const updated = { ...existing, ...updates };
    await kv.set(`vendor:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete("/make-server-02fd4b7a/vendors/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`vendor:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========== USERS ==========
app.get("/make-server-02fd4b7a/users", async (c) => {
  try {
    const users = await kv.getByPrefix("user:");
    return c.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/users", async (c) => {
  try {
    const user = await c.req.json();
    await kv.set(`user:${user.id}`, user);
    return c.json({ success: true, data: user });
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========== EMPLOYEES ==========
app.get("/make-server-02fd4b7a/employees", async (c) => {
  try {
    const employees = await kv.getByPrefix("employee:");
    return c.json({ success: true, data: employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/employees", async (c) => {
  try {
    const employee = await c.req.json();
    await kv.set(`employee:${employee.id}`, employee);
    return c.json({ success: true, data: employee });
  } catch (error) {
    console.error("Error creating employee:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put("/make-server-02fd4b7a/employees/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`employee:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    const updated = { ...existing, ...updates };
    await kv.set(`employee:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating employee:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete("/make-server-02fd4b7a/employees/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`employee:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========== PURCHASE ORDERS ==========
app.get("/make-server-02fd4b7a/purchase-orders", async (c) => {
  try {
    const pos = await kv.getByPrefix("po:");
    return c.json({ success: true, data: pos });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/purchase-orders", async (c) => {
  try {
    const po = await c.req.json();
    await kv.set(`po:${po.id}`, po);
    return c.json({ success: true, data: po });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put("/make-server-02fd4b7a/purchase-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`po:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Purchase order not found" }, 404);
    }
    const updated = { ...existing, ...updates };
    await kv.set(`po:${id}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete("/make-server-02fd4b7a/purchase-orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`po:${id}`);
    if (!existing) {
      return c.json({ success: false, error: "Purchase order not found" }, 404);
    }
    await kv.del(`po:${id}`);
    return c.json({ success: true, data: null });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========== PRINT TEMPLATES ==========
app.get("/make-server-02fd4b7a/print-templates", async (c) => {
  try {
    const templates = await kv.getByPrefix("template:");
    return c.json({ success: true, data: templates });
  } catch (error) {
    console.error("Error fetching print templates:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/print-templates", async (c) => {
  try {
    const template = await c.req.json();
    await kv.set(`template:${template.id}`, template);
    return c.json({ success: true, data: template });
  } catch (error) {
    console.error("Error creating print template:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Generic endpoints for other entities
const entities = [
  'task', 'taskGroup', 'budgetItem', 'variationOrder',
  'vendorInvoice', 'vendorClaim', 'customerInvoice',
  'paymentRequest', 'payment', 'document'
];

entities.forEach(entity => {
  app.get(`/make-server-02fd4b7a/${entity}s`, async (c) => {
    try {
      const data = await kv.getByPrefix(`${entity}:`);
      return c.json({ success: true, data });
    } catch (error) {
      console.error(`Error fetching ${entity}s:`, error);
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  app.post(`/make-server-02fd4b7a/${entity}s`, async (c) => {
    try {
      const item = await c.req.json();
      await kv.set(`${entity}:${item.id}`, item);
      return c.json({ success: true, data: item });
    } catch (error) {
      console.error(`Error creating ${entity}:`, error);
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  app.put(`/make-server-02fd4b7a/${entity}s/:id`, async (c) => {
    try {
      const id = c.req.param("id");
      const updates = await c.req.json();
      const existing = await kv.get(`${entity}:${id}`);
      if (!existing) {
        return c.json({ success: false, error: `${entity} not found` }, 404);
      }
      const updated = { ...existing, ...updates };
      await kv.set(`${entity}:${id}`, updated);
      return c.json({ success: true, data: updated });
    } catch (error) {
      console.error(`Error updating ${entity}:`, error);
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  app.delete(`/make-server-02fd4b7a/${entity}s/:id`, async (c) => {
    try {
      const id = c.req.param("id");
      await kv.del(`${entity}:${id}`);
      return c.json({ success: true });
    } catch (error) {
      console.error(`Error deleting ${entity}:`, error);
      return c.json({ success: false, error: error.message }, 500);
    }
  });
});

// ========== DOCUMENT STORAGE ==========
// Initialize Supabase client for storage operations
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket name for document storage
const DOCS_BUCKET = 'make-02fd4b7a-documents';

// Initialize bucket on first request
let bucketInitialized = false;
async function ensureBucket() {
  if (bucketInitialized) return;
  
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === DOCS_BUCKET);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(DOCS_BUCKET, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('Document storage bucket created successfully');
      }
    }
    bucketInitialized = true;
  } catch (error) {
    console.error('Error ensuring bucket:', error);
  }
}

// Upload document
app.post("/make-server-02fd4b7a/documents/upload", async (c) => {
  try {
    await ensureBucket();
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const folderId = formData.get('folderId') as string;
    const uploadedBy = formData.get('uploadedBy') as string;
    const documentType = formData.get('documentType') as string || 'other';
    
    if (!file || !projectId) {
      return c.json({ success: false, error: 'File and projectId are required' }, 400);
    }
    
    // Generate unique file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${projectId}/${folderId || 'root'}/${timestamp}_${file.name}`;
    
    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ success: false, error: uploadError.message }, 500);
    }
    
    // Create signed URL (valid for 1 year)
    const { data: signedUrlData } = await supabase.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(filePath, 31536000);
    
    // Save document metadata
    const documentId = `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const documentMetadata = {
      id: documentId,
      projectId,
      folderId: folderId || null,
      name: file.name,
      type: documentType,
      fileUrl: signedUrlData?.signedUrl || '',
      filePath: filePath,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      version: 1,
      tags: [],
    };
    
    await kv.set(`document:${documentId}`, documentMetadata);
    
    // Log activity
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`docActivity:${activityId}`, {
      id: activityId,
      documentId,
      projectId,
      userId: uploadedBy,
      action: 'upload',
      details: `Uploaded file: ${file.name}`,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true, data: documentMetadata });
  } catch (error) {
    console.error('Document upload error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete document
app.delete("/make-server-02fd4b7a/documents/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const document = await kv.get(`document:${id}`);
    
    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }
    
    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(DOCS_BUCKET)
      .remove([document.filePath]);
    
    if (deleteError) {
      console.error('Storage delete error:', deleteError);
    }
    
    // Delete metadata
    await kv.del(`document:${id}`);
    
    // Log activity
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = c.req.header('X-User-Id') || 'unknown';
    await kv.set(`docActivity:${activityId}`, {
      id: activityId,
      documentId: id,
      projectId: document.projectId,
      userId,
      action: 'delete',
      details: `Deleted file: ${document.name}`,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Refresh signed URL
app.post("/make-server-02fd4b7a/documents/:id/refresh-url", async (c) => {
  try {
    const id = c.req.param("id");
    const document = await kv.get(`document:${id}`);
    
    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }
    
    // Create new signed URL
    const { data: signedUrlData } = await supabase.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(document.filePath, 31536000);
    
    // Update document metadata
    document.fileUrl = signedUrlData?.signedUrl || '';
    await kv.set(`document:${id}`, document);
    
    return c.json({ success: true, data: document });
  } catch (error) {
    console.error('URL refresh error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Folders endpoints
app.get("/make-server-02fd4b7a/folders", async (c) => {
  try {
    const folders = await kv.getByPrefix("folder:");
    return c.json({ success: true, data: folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post("/make-server-02fd4b7a/folders", async (c) => {
  try {
    const folder = await c.req.json();
    await kv.set(`folder:${folder.id}`, folder);
    
    // Log activity
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`docActivity:${activityId}`, {
      id: activityId,
      folderId: folder.id,
      projectId: folder.projectId,
      userId: folder.createdBy,
      action: 'create_folder',
      details: `Created folder: ${folder.name}`,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true, data: folder });
  } catch (error) {
    console.error("Error creating folder:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put("/make-server-02fd4b7a/folders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`folder:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: "Folder not found" }, 404);
    }
    
    const updated = { ...existing, ...updates };
    await kv.set(`folder:${id}`, updated);
    
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating folder:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete("/make-server-02fd4b7a/folders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const folder = await kv.get(`folder:${id}`);
    
    if (!folder) {
      return c.json({ success: false, error: "Folder not found" }, 404);
    }
    
    // Check if folder has documents
    const allDocs = await kv.getByPrefix("document:");
    const docsInFolder = allDocs.filter((doc: any) => doc.folderId === id);
    
    if (docsInFolder.length > 0) {
      return c.json({ 
        success: false, 
        error: "Cannot delete folder with documents. Please move or delete documents first." 
      }, 400);
    }
    
    await kv.del(`folder:${id}`);
    
    // Log activity
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = c.req.header('X-User-Id') || 'unknown';
    await kv.set(`docActivity:${activityId}`, {
      id: activityId,
      folderId: id,
      projectId: folder.projectId,
      userId,
      action: 'delete_folder',
      details: `Deleted folder: ${folder.name}`,
      timestamp: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Document activities
app.get("/make-server-02fd4b7a/document-activities", async (c) => {
  try {
    const activities = await kv.getByPrefix("docActivity:");
    return c.json({ success: true, data: activities });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========== END DOCUMENT STORAGE ==========

Deno.serve(app.fetch);