import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataStore, SystemUser } from '../data/store';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Search, UserPlus, Mail } from 'lucide-react';

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

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
    employeeId: '', // Link to employee
  });

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async () => {
    await dataStore.addUser(newUser);
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
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500">Only administrators can manage users</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-500 mt-1">Manage system users and permissions</p>
        </div>

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
                  // Auto-fill user data from selected employee
                  if (value) {
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
                <Button onClick={handleCreateUser} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
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
          return (
            <Card key={u.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#7A1516] text-white rounded-full flex items-center justify-center text-lg font-semibold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{u.name}</h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      {linkedEmployee && (
                        <p className="text-xs text-blue-600 mt-1">
                          🔗 Linked to {linkedEmployee.employeeId} - {linkedEmployee.position || 'Employee'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                        {u.role}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">{u.department || 'No Department'}</p>
                    </div>
                    <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                      {u.status}
                    </Badge>
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
    </div>
  );
}