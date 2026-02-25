import React, { useState, useEffect, useRef } from 'react';
import { dataStore } from '../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  Plus, FileText, Download, Trash2, Folder, FolderPlus, Upload, 
  Eye, X, Search, Filter, Grid, List, Clock, User, File,
  FileImage, FileSpreadsheet, FileType, FileCode, FileArchive,
  Share2, Edit, MoreVertical, ChevronRight, Home, Lock, Users
} from 'lucide-react';
import { projectId as supabaseProjectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  projectId: string;
}

interface DocumentFile {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  type: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  version: number;
  tags: string[];
  permissions?: {
    view: string[];
    edit: string[];
    delete: string[];
  };
}

interface FolderItem {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  description?: string;
  color?: string;
  createdBy: string;
  createdAt: string;
  permissions?: {
    view: string[];
    edit: string[];
    delete: string[];
  };
}

interface Activity {
  id: string;
  documentId?: string;
  folderId?: string;
  projectId: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export function ProjectDocumentsTab({ projectId }: Props) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newFolder, setNewFolder] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  
  // Get current user from Auth Context
  const { user: currentUser } = useAuth();
  const users = dataStore.getUsers();

  // Load data
  useEffect(() => {
    loadDocuments();
    loadFolders();
    loadActivities();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-02fd4b7a/documents`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        const projectDocs = data.data.filter((doc: DocumentFile) => doc.projectId === projectId);
        setDocuments(projectDocs);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-02fd4b7a/folders`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        const projectFolders = data.data.filter((folder: FolderItem) => folder.projectId === projectId);
        setFolders(projectFolders);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-02fd4b7a/document-activities`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );
      const data = await response.json();
      if (data.success) {
        const projectActivities = data.data
          .filter((activity: Activity) => activity.projectId === projectId)
          .sort((a: Activity, b: Activity) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        setActivities(projectActivities);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  // File upload handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    handleUpload(Array.from(files));
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    const successCount = { value: 0 };

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('folderId', currentFolderId || '');
        formData.append('uploadedBy', currentUser?.id || '1');
        formData.append('documentType', 'other');

        const response = await fetch(
          `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-02fd4b7a/documents/upload`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${publicAnonKey}` },
            body: formData
          }
        );

        const data = await response.json();
        if (data.success) {
          successCount.value++;
        } else {
          toast.error(`Failed to upload ${file.name}: ${data.error}`);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setUploadDialogOpen(false);
    
    if (successCount.value > 0) {
      toast.success(`Successfully uploaded ${successCount.value} file(s)`);
      await loadDocuments();
      await loadActivities();
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  // Folder operations
  const handleCreateFolder = async () => {
    if (!newFolder.name.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const folder: FolderItem = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        parentId: currentFolderId,
        name: newFolder.name,
        description: newFolder.description,
        color: newFolder.color,
        createdBy: currentUser?.id || '1',
        createdAt: new Date().toISOString(),
        permissions: {
          view: users.map(u => u.id),
          edit: [currentUser?.id || '1'],
          delete: [currentUser?.id || '1']
        }
      };

      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-02fd4b7a/folders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(folder)
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Folder created successfully');
        setFolderDialogOpen(false);
        setNewFolder({ name: '', description: '', color: '#3B82F6' });
        await loadFolders();
        await loadActivities();
      } else {
        toast.error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-02fd4b7a/folders/${folderId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Id': currentUser?.id || '1'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Folder deleted successfully');
        await loadFolders();
        await loadActivities();
      } else {
        toast.error(data.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  // Document operations
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-02fd4b7a/documents/${docId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Id': currentUser?.id || '1'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Document deleted successfully');
        await loadDocuments();
        await loadActivities();
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setPreviewOpen(false);
        }
      } else {
        toast.error(data.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = (doc: DocumentFile) => {
    window.open(doc.fileUrl, '_blank');
  };

  const handlePreview = (doc: DocumentFile) => {
    setSelectedDoc(doc);
    setPreviewOpen(true);
  };

  // Filter documents and folders
  const currentFolderDocs = documents.filter(
    doc => doc.folderId === currentFolderId &&
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSubFolders = folders.filter(
    folder => folder.parentId === currentFolderId &&
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get breadcrumb path
  const getBreadcrumbs = () => {
    const breadcrumbs: FolderItem[] = [];
    let current = currentFolderId;
    
    while (current) {
      const folder = folders.find(f => f.id === current);
      if (folder) {
        breadcrumbs.unshift(folder);
        current = folder.parentId;
      } else {
        break;
      }
    }
    
    return breadcrumbs;
  };

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (mimeType.includes('pdf')) return <FileType className="w-5 h-5" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-5 h-5" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="w-5 h-5" />;
    if (mimeType.includes('code') || mimeType.includes('text')) return <FileCode className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get user name
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown User';
  };

  // Can render preview?
  const canPreview = (mimeType: string) => {
    return mimeType.startsWith('image/') || 
           mimeType.includes('pdf') || 
           mimeType.startsWith('text/') ||
           mimeType.includes('json');
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-gray-500 text-sm mt-1">
            {documents.length} documents in {folders.length} folders
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Create a new folder to organize your documents
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Folder Name *</Label>
                  <Input
                    value={newFolder.name}
                    onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                    placeholder="Enter folder name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newFolder.description}
                    onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                    placeholder="Enter folder description (optional)"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Folder Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={newFolder.color}
                      onChange={(e) => setNewFolder({ ...newFolder, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-gray-500">{newFolder.color}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>
                  Upload one or multiple files to the current folder
                </DialogDescription>
              </DialogHeader>
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
                <p className="text-lg font-medium mb-2">
                  Drag and drop files here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Browse Files'}
                </Button>
                <p className="text-xs text-gray-400 mt-4">
                  Maximum file size: 50MB
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents and folders..."
            className="pl-10"
          />
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="flex items-center gap-1 hover:text-[#7A1516] transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Root</span>
          </button>
          {breadcrumbs.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className="hover:text-[#7A1516] transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="files" className="w-full">
        <TabsList>
          <TabsTrigger value="files">
            <Folder className="w-4 h-4 mr-2" />
            Files & Folders
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="w-4 h-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Files & Folders Tab */}
        <TabsContent value="files" className="mt-6">
          {currentSubFolders.length === 0 && currentFolderDocs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">This folder is empty</p>
                <p className="text-sm text-gray-400">Upload files or create folders to get started</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {/* Folders */}
                  {currentSubFolders.map(folder => (
                    <Card 
                      key={folder.id}
                      className="cursor-pointer hover:shadow-lg transition-all group"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: folder.color + '20' }}
                            onClick={() => setCurrentFolderId(folder.id)}
                          >
                            <Folder className="w-6 h-6" style={{ color: folder.color }} />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteFolder(folder.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                        <div onClick={() => setCurrentFolderId(folder.id)}>
                          <h3 className="font-medium text-sm mb-1 truncate">{folder.name}</h3>
                          {folder.description && (
                            <p className="text-xs text-gray-500 truncate">{folder.description}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Documents */}
                  {currentFolderDocs.map(doc => (
                    <Card 
                      key={doc.id}
                      className="cursor-pointer hover:shadow-lg transition-all group"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            {doc.mimeType.startsWith('image/') ? (
                              <img 
                                src={doc.fileUrl} 
                                alt={doc.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              getFileIcon(doc.mimeType)
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {canPreview(doc.mimeType) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handlePreview(doc)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <h3 className="font-medium text-sm mb-1 truncate" title={doc.name}>
                          {doc.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(doc.fileSize)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Modified</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
                          <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {/* Folders */}
                        {currentSubFolders.map(folder => (
                          <tr key={folder.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div 
                                className="flex items-center gap-3 cursor-pointer"
                                onClick={() => setCurrentFolderId(folder.id)}
                              >
                                <div 
                                  className="w-8 h-8 rounded flex items-center justify-center"
                                  style={{ backgroundColor: folder.color + '20' }}
                                >
                                  <Folder className="w-4 h-4" style={{ color: folder.color }} />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{folder.name}</p>
                                  {folder.description && (
                                    <p className="text-xs text-gray-500">{folder.description}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">Folder</td>
                            <td className="px-6 py-4 text-sm">-</td>
                            <td className="px-6 py-4 text-sm">
                              {new Date(folder.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm">{getUserName(folder.createdBy)}</td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteFolder(folder.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {/* Documents */}
                        {currentFolderDocs.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                  {doc.mimeType.startsWith('image/') ? (
                                    <img 
                                      src={doc.fileUrl} 
                                      alt={doc.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    getFileIcon(doc.mimeType)
                                  )}
                                </div>
                                <p className="font-medium text-sm truncate max-w-xs" title={doc.name}>
                                  {doc.name}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm capitalize">
                              {doc.mimeType.split('/')[0]}
                            </td>
                            <td className="px-6 py-4 text-sm">{formatFileSize(doc.fileSize)}</td>
                            <td className="px-6 py-4 text-sm">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm">{getUserName(doc.uploadedBy)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canPreview(doc.mimeType) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreview(doc)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(doc)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
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
            </>
          )}
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity recorded yet
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.slice(0, 50).map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{getUserName(activity.userId)}</span>
                          {' '}{activity.details}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {activity.action.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate pr-4">{selectedDoc?.name}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedDoc && handleDownload(selectedDoc)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[70vh]">
            {selectedDoc && (
              <>
                {selectedDoc.mimeType.startsWith('image/') && (
                  <img 
                    src={selectedDoc.fileUrl} 
                    alt={selectedDoc.name}
                    className="w-full rounded-lg"
                  />
                )}
                
                {selectedDoc.mimeType.includes('pdf') && (
                  <iframe
                    src={selectedDoc.fileUrl}
                    className="w-full h-[600px] rounded-lg border"
                    title={selectedDoc.name}
                  />
                )}
                
                {!selectedDoc.mimeType.startsWith('image/') && !selectedDoc.mimeType.includes('pdf') && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Preview not available for this file type</p>
                    <Button
                      onClick={() => handleDownload(selectedDoc)}
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

          {/* File Details */}
          {selectedDoc && (
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Size</p>
                  <p className="font-medium">{formatFileSize(selectedDoc.fileSize)}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Type</p>
                  <p className="font-medium capitalize">{selectedDoc.mimeType.split('/')[0]}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Uploaded</p>
                  <p className="font-medium">
                    {new Date(selectedDoc.uploadedAt).toLocaleDateString()}
                  </p>
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