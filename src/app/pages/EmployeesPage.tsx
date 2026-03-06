import React, { useState, useEffect } from 'react';
import { dataStore, Employee } from '../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Users, Plus, Edit2, Trash2, Search, X, UserCheck, Briefcase, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';
import { usePermissionsMatrix } from '../contexts/PermissionsMatrixContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AccessDenied } from '../components/AccessDenied';

export function EmployeesPage() {
  const { t } = useLanguage();
  const { hasPermission } = usePermissionsMatrix();
  const canView = hasPermission('employees', 'view');
  const canCreate = hasPermission('employees', 'create');
  const canEdit = hasPermission('employees', 'edit');
  const canDelete = hasPermission('employees', 'delete');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    nationality: '',
    idNumber: '',
    passportNumber: '',
    department: '',
    position: '',
    assignedRole: '',
    joiningDate: '',
    bankName: '',
    iban: '',
    emergencyContact: '',
    emergencyPhone: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'on_leave',
    userId: '',
  });

  const assignedRoles = [
    'Project Manager',
    'Assistant PM',
    'Site Engineer',
    'Foreman',
    'Electrical Technician',
    'Plumbing Technician',
    'HVAC Technician',
    'Helper / Laborer',
    'Safety Officer',
    'QA/QC',
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const data = await dataStore.getEmployees();
    setEmployees(data);
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      nationality: '',
      idNumber: '',
      passportNumber: '',
      department: '',
      position: '',
      assignedRole: '',
      joiningDate: '',
      bankName: '',
      iban: '',
      emergencyContact: '',
      emergencyPhone: '',
      address: '',
      notes: '',
      status: 'active',
      userId: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      nationality: employee.nationality || '',
      idNumber: employee.idNumber || '',
      passportNumber: employee.passportNumber || '',
      department: employee.department || '',
      position: employee.position || '',
      assignedRole: employee.assignedRole || '',
      joiningDate: employee.joiningDate || '',
      bankName: employee.bankName || '',
      iban: employee.iban || '',
      emergencyContact: employee.emergencyContact || '',
      emergencyPhone: employee.emergencyPhone || '',
      address: employee.address || '',
      notes: employee.notes || '',
      status: employee.status,
      userId: employee.userId || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const others = employees.filter(e => !editingEmployee || e.id !== editingEmployee.id);
    const emailVal = (formData.email || '').trim().toLowerCase();
    const phoneVal = (formData.phone || '').trim();

    if (emailVal) {
      const duplicateEmail = others.find(e => (e.email || '').trim().toLowerCase() === emailVal);
      if (duplicateEmail) {
        toast.error('An employee with this email already exists');
        return;
      }
    }
    if (phoneVal) {
      const duplicatePhone = others.find(e => (e.phone || '').trim() === phoneVal);
      if (duplicatePhone) {
        toast.error('An employee with this phone number already exists');
        return;
      }
    }
    if (formData.idNumber?.trim()) {
      const duplicateId = others.find(e => (e.idNumber || '').trim() === formData.idNumber.trim());
      if (duplicateId) {
        toast.error('An employee with this ID number already exists');
        return;
      }
    }
    if (formData.passportNumber?.trim()) {
      const duplicatePassport = others.find(e => (e.passportNumber || '').trim() === formData.passportNumber.trim());
      if (duplicatePassport) {
        toast.error('An employee with this passport number already exists');
        return;
      }
    }
    if (formData.userId?.trim()) {
      const duplicateUser = others.find(e => (e.userId || '').trim() === formData.userId.trim());
      if (duplicateUser) {
        toast.error('This user is already linked to another employee');
        return;
      }
    }

    if (editingEmployee) {
      await dataStore.updateEmployee(editingEmployee.id, formData);
      toast.success('Employee updated successfully');
    } else {
      await dataStore.addEmployee(formData);
      toast.success('Employee added successfully');
    }
    await loadEmployees();
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      await dataStore.deleteEmployee(id);
      toast.success('Employee deleted successfully');
      await loadEmployees();
    }
  };

  const getFilteredEmployees = () => {
    let filtered = employees;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.name.toLowerCase().includes(query) ||
          e.employeeId.toLowerCase().includes(query) ||
          e.email?.toLowerCase().includes(query) ||
          e.phone?.includes(query) ||
          e.department?.toLowerCase().includes(query) ||
          e.position?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-red-100 text-red-700';
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'on_leave':
        return 'On Leave';
      default:
        return status;
    }
  };

  const getDepartmentCounts = () => {
    const counts: { [key: string]: number } = {};
    employees.forEach(emp => {
      if (emp.department) {
        counts[emp.department] = (counts[emp.department] || 0) + 1;
      }
    });
    return counts;
  };

  const filteredEmployees = getFilteredEmployees();
  const departmentCounts = getDepartmentCounts();

  if (!canView) {
    return <AccessDenied message={t('common.accessDenied')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('employees.title')}</h1>
          <p className="text-gray-500">{t('employees.subtitle')}</p>
        </div>
        {canCreate && (
        <Button onClick={handleAddNew} className="bg-[#7A1516] hover:bg-[#5A1012]">
          <Plus className="w-4 h-4 mr-2" />
          {t('employees.newEmployee')}
        </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('employees.totalEmployees')}</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('employees.active')}</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('employees.onLeave')}</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.status === 'on_leave').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('employees.departments')}</p>
                <p className="text-2xl font-bold">{Object.keys(departmentCounts).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>{t('employees.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('employees.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('projects.allStatus')}</SelectItem>
                <SelectItem value="active">{t('employees.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                <SelectItem value="on_leave">{t('employees.onLeave')}</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || filterStatus !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Employees List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-36" />
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {employees.length === 0 ? 'No employees added yet' : 'No employees match your search criteria'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{employee.name}</h4>
                        <Badge className={getStatusColor(employee.status)}>{getStatusLabel(employee.status)}</Badge>
                        <span className="text-sm text-gray-500">ID: {employee.employeeId}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        {employee.position && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            <span>{employee.position}</span>
                          </div>
                        )}
                        {employee.department && (
                          <div>
                            <span className="font-medium">Department:</span> {employee.department}
                          </div>
                        )}
                        {employee.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.nationality && (
                          <div>
                            <span className="font-medium">Nationality:</span> {employee.nationality}
                          </div>
                        )}
                        {employee.joiningDate && (
                          <div>
                            <span className="font-medium">Joined:</span>{' '}
                            {new Date(employee.joiningDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      )}
                      {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 mb-4">Basic Information</h3>
              </div>

              <div className="space-y-2">
                <Label>
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('employees.active')}</SelectItem>
                    <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                    <SelectItem value="on_leave">{t('employees.onLeave')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+966 50 123 4567"
                />
              </div>

              {/* Position & Department */}
              <div className="md:col-span-2">
                <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 mb-4 mt-4">Work Information</h3>
              </div>

              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="e.g., Site Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="e.g., Engineering"
                />
              </div>

              <div className="space-y-2">
                <Label>Assigned Role</Label>
                <Select value={formData.assignedRole} onValueChange={(value) => handleInputChange('assignedRole', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Joining Date</Label>
                <Input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                />
              </div>

              {/* Personal Information */}
              <div className="md:col-span-2">
                <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 mb-4 mt-4">Personal Information</h3>
              </div>

              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  placeholder="e.g., Saudi"
                />
              </div>

              <div className="space-y-2">
                <Label>ID Number (Iqama/National ID)</Label>
                <Input
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  placeholder="Enter ID number"
                />
              </div>

              <div className="space-y-2">
                <Label>Passport Number</Label>
                <Input
                  value={formData.passportNumber}
                  onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                  placeholder="Enter passport number"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>

              {/* Banking Information */}
              <div className="md:col-span-2">
                <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 mb-4 mt-4">Banking Information</h3>
              </div>

              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  placeholder="e.g., Al Rajhi Bank"
                />
              </div>

              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={formData.iban}
                  onChange={(e) => handleInputChange('iban', e.target.value)}
                  placeholder="SA0000000000000000000000"
                />
              </div>

              {/* Emergency Contact */}
              <div className="md:col-span-2">
                <h3 className="font-semibold text-sm text-gray-700 border-b pb-2 mb-4 mt-4">Emergency Contact</h3>
              </div>

              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  placeholder="Enter contact name"
                />
              </div>

              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <Input
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                  placeholder="+966 50 123 4567"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            {editingEmployee && canEdit && (
            <Button onClick={handleSave} className="bg-[#7A1516] hover:bg-[#5A1012]">
              Update Employee
            </Button>
            )}
            {!editingEmployee && canCreate && (
            <Button onClick={handleSave} className="bg-[#7A1516] hover:bg-[#5A1012]">
              Add Employee
            </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}