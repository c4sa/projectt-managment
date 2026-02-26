import React, { useState, useEffect, useRef } from 'react';
import { dataStore } from '../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
  Plus, FileText, Download, Trash2, Upload,
  Eye, X, Search, Grid, List,
  FileImage, FileSpreadsheet, FileType, FileCode, FileArchive,
} from 'lucide-react';
import { supabaseAuth } from '../../lib/authClient';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  projectId: string;
}

interface DocumentRecord {
  id: string;
  projectId: string;
  name: string;
  type: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  // extra metadata stored in name for display
  mimeType?: string;
}

const BUCKET = 'project-documents';

// Map MIME type → document type enum
function mimeToDocType(mime: string): string {
  if (mime.includes('pdf')) return 'contract';
  if (mime.startsWith('image/')) return 'report';
  return 'other';
}

export function ProjectDocumentsTab({ projectId }: Props) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dragActive, setDragActive] = useState(false);
  const [docType, setDocType] = useState<string>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<any[]>([]);

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadDocuments();
    dataStore.getUsers().then(setUsers);
  }, [projectId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await dataStore.getDocuments(projectId);
      setDocuments(docs as DocumentRecord[]);
    } catch (err) {
      console.error('Error loading documents:', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        // Upload file to Supabase Storage
        const filePath = `${projectId}/${Date.now()}_${file.name}`;
        const { data: storageData, error: storageErr } = await supabaseAuth.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: false });

        if (storageErr) {
          console.error('Storage upload error:', storageErr);
          toast.error(`Failed to upload ${file.name}: ${storageErr.message}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabaseAuth.storage
          .from(BUCKET)
          .getPublicUrl(filePath);

        const fileUrl = urlData?.publicUrl ?? '';

        // Save metadata via API
        await dataStore.addDocument({
          projectId,
          name: file.name,
          type: docType as any,
          fileUrl,
          fileSize: file.size,
          uploadedBy: currentUser?.id ?? 'unknown',
          uploadedAt: new Date().toISOString(),
        });

        successCount++;
      } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err);
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    setUploadDialogOpen(false);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
      await loadDocuments();
    }
  };

  const handleDelete = async (doc: DocumentRecord) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;

    try {
      // Extract storage path from URL
      const urlObj = new URL(doc.fileUrl);
      const pathParts = urlObj.pathname.split(`/object/public/${BUCKET}/`);
      const storagePath = pathParts[1] ?? '';

      if (storagePath) {
        const { error: storageErr } = await supabaseAuth.storage
          .from(BUCKET)
          .remove([storagePath]);
        if (storageErr) {
          console.warn('Storage delete warning:', storageErr.message);
          // Non-fatal — still remove the DB record
        }
      }

      await dataStore.deleteDocument(doc.id);
      toast.success('Document deleted');
      await loadDocuments();
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        setPreviewOpen(false);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(`Failed to delete document: ${err.message}`);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage className="w-5 h-5" />;
    if (ext === 'pdf') return <FileType className="w-5 h-5" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="w-5 h-5" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive className="w-5 h-5" />;
    if (['js', 'ts', 'json', 'html', 'css'].includes(ext)) return <FileCode className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const canPreview = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext);
  };

  const isImage = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name ?? userId ?? 'Unknown';
  };

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-gray-500 text-sm mt-1">{documents.length} document(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-[#7A1516] hover:bg-[#5A1012]' : ''}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[#7A1516] hover:bg-[#5A1012]' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            className="bg-[#7A1516] hover:bg-[#5A1012]"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="pl-10"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading documents...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No documents yet</p>
            <p className="text-sm text-gray-400">Upload files to get started</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(doc => (
            <Card key={doc.id} className="cursor-pointer hover:shadow-lg transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {isImage(doc.name) ? (
                      <img src={doc.fileUrl} alt={doc.name} className="w-full h-full object-cover" />
                    ) : (
                      getFileIcon(doc.name)
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canPreview(doc.name) && (
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedDoc(doc); setPreviewOpen(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => window.open(doc.fileUrl, '_blank')}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-medium text-sm truncate" title={doc.name}>{doc.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{formatFileSize(doc.fileSize)}</p>
                <Badge variant="outline" className="text-xs mt-2 capitalize">{doc.type}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">By</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          {isImage(doc.name) ? (
                            <img src={doc.fileUrl} alt={doc.name} className="w-full h-full object-cover rounded" />
                          ) : (
                            getFileIcon(doc.name)
                          )}
                        </div>
                        <p className="font-medium text-sm truncate max-w-xs" title={doc.name}>{doc.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">{doc.type}</td>
                    <td className="px-6 py-4 text-sm">{formatFileSize(doc.fileSize)}</td>
                    <td className="px-6 py-4 text-sm">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{getUserName(doc.uploadedBy)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canPreview(doc.name) && (
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedDoc(doc); setPreviewOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => window.open(doc.fileUrl, '_blank')}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>Upload files for this project</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="drawing">Drawing</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-[#7A1516] bg-red-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drag and drop files here</p>
              <p className="text-sm text-gray-500 mb-4">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleUpload(Array.from(e.target.files));
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Browse Files'}
              </Button>
              <p className="text-xs text-gray-400 mt-4">Maximum file size: 50MB</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate pr-4">{selectedDoc?.name}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => selectedDoc && window.open(selectedDoc.fileUrl, '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-auto max-h-[70vh]">
            {selectedDoc && (
              <>
                {isImage(selectedDoc.name) && (
                  <img src={selectedDoc.fileUrl} alt={selectedDoc.name} className="w-full rounded-lg" />
                )}
                {selectedDoc.name.toLowerCase().endsWith('.pdf') && (
                  <iframe
                    src={selectedDoc.fileUrl}
                    className="w-full h-[600px] rounded-lg border"
                    title={selectedDoc.name}
                  />
                )}
                {!isImage(selectedDoc.name) && !selectedDoc.name.toLowerCase().endsWith('.pdf') && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Preview not available for this file type</p>
                    <Button
                      onClick={() => window.open(selectedDoc.fileUrl, '_blank')}
                      className="mt-4 bg-[#7A1516] hover:bg-[#5A1012]"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedDoc && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Size</p>
                  <p className="font-medium">{formatFileSize(selectedDoc.fileSize)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Type</p>
                  <p className="font-medium capitalize">{selectedDoc.type}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Uploaded</p>
                  <p className="font-medium">{new Date(selectedDoc.uploadedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Uploaded By</p>
                  <p className="font-medium">{getUserName(selectedDoc.uploadedBy)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
