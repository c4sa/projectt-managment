import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dataStore } from '../../data/store';
import { getAccessToken } from '../../lib/authClient';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Search, UserPlus, Mail, Pencil, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';

export function UsersManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);

  // Delete confirm state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [u, e] = await Promise.all([dataStore.getUsers(), dataStore.getEmployees()]);
      setUsers(u);
      setEmployees(e);
    };
    load();
  }, []);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    phone: '',
    department: '',
    status: 'active' as 'active' | 'inactive',
    employeeId: '',
  });

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [inviting, setInviting] = useState(false);

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setInviting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to invite user');
        return;
      }

      toast.success(`Invitation sent to ${newUser.email}`);
      setUsers(await dataStore.getUsers());
      setDialogOpen(false);
      setNewUser({
        name: '',
        email: '',
        role: 'user',
        phone: '',
        department: '',
        status: 'active',
        employeeId: '',
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const openEditDialog = (u: any) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/auth/manage-user/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: editRole, status: editStatus }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to update user');
        return;
      }
      toast.success('User updated successfully');
      setUsers(await dataStore.getUsers());
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u: any) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/auth/manage-user/${u.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to update user status');
        return;
      }
      toast.success(newStatus === 'inactive' ? `${u.name} deactivated` : `${u.name} activated`);
      setUsers(await dataStore.getUsers());
    } catch (e: any) {
      toast.error(e.message || 'Failed to update user status');
    }
  };

  const openDeleteDialog = (u: any) => {
    setDeletingUser(u);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/auth/manage-user/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to delete user');
        return;
      }
      toast.success(`${deletingUser.name} deleted`);
      setUsers(await dataStore.getUsers());
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Access Denied</h3>
          <p className="text-gray-500">Only administrators can manage users</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-gray-500">Manage system users and permissions</p>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@corecode.sa"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as 'admin' | 'user' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+966 XX XXX XXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  placeholder="e.g., Engineering, Finance"
                />
              </div>

              <div className="space-y-2">
                <Label>Link to Employee (Optional)</Label>
                <Select value={newUser.employeeId} onValueChange={(value) => {
                  setNewUser({ ...newUser, employeeId: value });
                  if (value && value !== 'none') {
                    const selectedEmployee = employees.find(emp => emp.id === value);
                    if (selectedEmployee) {
                      setNewUser(prev => ({
                        ...prev,
                        employeeId: value,
                        name: prev.name || selectedEmployee.name,
                        email: prev.email || selectedEmployee.email || '',
                        phone: prev.phone || selectedEmployee.phone || '',
                        department: prev.department || selectedEmployee.department || '',
                      }));
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - Create without employee link</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.employeeId} - {emp.name} ({emp.position || 'No Position'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Selecting an employee will auto-fill their information</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={inviting} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  <Mail className="w-4 h-4 mr-2" />
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map((u) => {
          const linkedEmployee = u.employeeId ? employees.find(emp => emp.id === u.employeeId) : null;
          const isSelf = u.id === user?.id;
          return (
            <Card key={u.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#7A1516] text-white rounded-full flex items-center justify-center text-lg font-semibold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {u.name}
                        {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                      </h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      {linkedEmployee && (
                        <p className="text-xs text-blue-600 mt-1">
                          Linked to {linkedEmployee.employeeId} - {linkedEmployee.position || 'Employee'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                        {u.role}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">{u.department || 'No Department'}</p>
                    </div>
                    <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                      {u.status}
                    </Badge>

                    {!isSelf && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit role / status"
                          onClick={() => openEditDialog(u)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={u.status === 'active' ? 'Deactivate user' : 'Activate user'}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'active'
                            ? <ShieldOff className="w-4 h-4 text-orange-500" />
                            : <ShieldCheck className="w-4 h-4 text-green-600" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete user"
                          onClick={() => openDeleteDialog(u)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No users found</p>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User — {editingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as 'admin' | 'user')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as 'active' | 'inactive')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="bg-[#7A1516] hover:bg-[#5A1012]">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to permanently delete <strong>{deletingUser?.name}</strong>?
              This will remove their login access and all associated data.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
