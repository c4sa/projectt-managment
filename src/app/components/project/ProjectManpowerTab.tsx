import React, { useState, useEffect } from 'react';
import { dataStore, ManpowerMember, ManpowerRole, Employee } from '../../data/store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Users, Plus, Edit2, Trash2, Search, X, UserCheck, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectId: string;
}

const roleLabels: Record<ManpowerRole, string> = {
  project_manager: 'Project Manager',
  assistant_pm: 'Assistant PM',
  site_engineer: 'Site Engineer',
  foreman: 'Foreman',
  technician_electrical: 'Electrical Technician',
  technician_plumbing: 'Plumbing Technician',
  technician_hvac: 'HVAC Technician',
  helper_laborer: 'Helper / Laborer',
  safety_officer: 'Safety Officer',
  qa_qc: 'QA/QC',
};

const roleColors: Record<ManpowerRole, string> = {
  project_manager: 'bg-purple-100 text-purple-700',
  assistant_pm: 'bg-indigo-100 text-indigo-700',
  site_engineer: 'bg-blue-100 text-blue-700',
  foreman: 'bg-cyan-100 text-cyan-700',
  technician_electrical: 'bg-yellow-100 text-yellow-700',
  technician_plumbing: 'bg-teal-100 text-teal-700',
  technician_hvac: 'bg-green-100 text-green-700',
  helper_laborer: 'bg-gray-100 text-gray-700',
  safety_officer: 'bg-orange-100 text-orange-700',
  qa_qc: 'bg-red-100 text-red-700',
};

export function ProjectManpowerTab({ projectId }: Props) {
  const [members, setMembers] = useState<ManpowerMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ManpowerMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<ManpowerRole | 'all'>('all');
  const [formData, setFormData] = useState({
    name: '',
    role: 'site_engineer' as ManpowerRole,
    employeeId: '',
    phone: '',
    email: '',
    nationality: '',
    idNumber: '',
    joiningDate: '',
    notes: '',
  });

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    const data = await dataStore.getManpowerMembers(projectId);
    setMembers(data);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleAddNew = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      role: 'site_engineer',
      employeeId: '',
      phone: '',
      email: '',
      nationality: '',
      idNumber: '',
      joiningDate: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (member: ManpowerMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      employeeId: member.employeeId || '',
      phone: member.phone || '',
      email: member.email || '',
      nationality: member.nationality || '',
      idNumber: member.idNumber || '',
      joiningDate: member.joiningDate || '',
      notes: member.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (editingMember) {
      // Update existing
      dataStore.updateManpowerMember(editingMember.id, {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Team member updated successfully');
    } else {
      // Create new
      dataStore.addManpowerMember({
        projectId,
        ...formData,
      });
      toast.success('Team member added successfully');
    }
    loadMembers();
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      dataStore.deleteManpowerMember(id);
      toast.success('Team member removed successfully');
      loadMembers();
    }
  };

  const getRoleCounts = () => {
    const counts: Record<ManpowerRole, number> = {
      project_manager: 0,
      assistant_pm: 0,
      site_engineer: 0,
      foreman: 0,
      technician_electrical: 0,
      technician_plumbing: 0,
      technician_hvac: 0,
      helper_laborer: 0,
      safety_officer: 0,
      qa_qc: 0,
    };
    members.forEach(member => {
      counts[member.role]++;
    });
    return counts;
  };

  const getFilteredMembers = () => {
    let filtered = members;

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(m => m.role === filterRole);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        m =>
          m.name.toLowerCase().includes(query) ||
          m.employeeId?.toLowerCase().includes(query) ||
          m.email?.toLowerCase().includes(query) ||
          m.phone?.includes(query)
      );
    }

    return filtered;
  };

  const roleCounts = getRoleCounts();
  const filteredMembers = getFilteredMembers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Project Manpower</h3>
          <p className="text-sm text-gray-500">Manage team members assigned to this project</p>
        </div>
        <Button onClick={handleAddNew} className="bg-[#7A1516] hover:bg-[#5A1012]">
          <Plus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#7A1516] text-white rounded-lg flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Team Members</p>
                <p className="text-3xl font-bold">{members.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Workforce Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(roleCounts).map(([role, count]) => (
              <div
                key={role}
                className="p-4 rounded-lg border bg-gray-50 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setFilterRole(filterRole === role ? 'all' : role as ManpowerRole)}
              >
                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-2 ${roleColors[role as ManpowerRole]}`}>
                  {roleLabels[role as ManpowerRole]}
                </div>
                <p className="text-2xl font-bold text-[#7A1516]">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, employee ID, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as ManpowerRole | 'all')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchQuery || filterRole !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterRole('all');
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Members List */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {members.length === 0
                  ? 'No team members added yet'
                  : 'No team members match your search criteria'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{member.name}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[member.role]}`}>
                          {roleLabels[member.role]}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        {member.employeeId && (
                          <div>
                            <span className="font-medium">Employee ID:</span> {member.employeeId}
                          </div>
                        )}
                        {member.phone && (
                          <div>
                            <span className="font-medium">Phone:</span> {member.phone}
                          </div>
                        )}
                        {member.email && (
                          <div>
                            <span className="font-medium">Email:</span> {member.email}
                          </div>
                        )}
                        {member.nationality && (
                          <div>
                            <span className="font-medium">Nationality:</span> {member.nationality}
                          </div>
                        )}
                        {member.idNumber && (
                          <div>
                            <span className="font-medium">ID Number:</span> {member.idNumber}
                          </div>
                        )}
                        {member.joiningDate && (
                          <div>
                            <span className="font-medium">Joining Date:</span>{' '}
                            {new Date(member.joiningDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {member.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {member.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
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
                <Label>
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  placeholder="e.g., EMP-001"
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
                <Label>Joining Date</Label>
                <Input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                />
              </div>

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
            <Button onClick={handleSave} className="bg-[#7A1516] hover:bg-[#5A1012]">
              {editingMember ? 'Update' : 'Add'} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}