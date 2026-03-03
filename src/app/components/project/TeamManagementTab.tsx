import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProjectPermissions } from '../../contexts/ProjectPermissionsContext';
import { useAuth } from '../../contexts/AuthContext';
import { dataStore } from '../../data/store';
import {
  Project,
  TeamMember,
  DEFAULT_TEAM_MEMBER_PERMISSIONS,
  ProjectPermissions,
} from '../../types/project';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { UserPlus, Users, Mail, Trash2, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface TeamManagementTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

export function TeamManagementTab({ project, onUpdateProject }: TeamManagementTabProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { canManageTeam } = useProjectPermissions();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editPermissionsOpen, setEditPermissionsOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    dataStore.getUsers().then((users) => {
      setAvailableUsers(
        users.map((u) => ({ id: u.id, name: u.name, email: u.email }))
      );
    });
  }, []);

  const canManage = canManageTeam(project);

  const handleAddMember = () => {
    const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
    if (!selectedUser) return;

    if (project.teamMembers.some((m) => m.userId === selectedUser.id)) {
      toast.error(t('team.userAlreadyMember'));
      return;
    }

    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      userId: selectedUser.id,
      userName: selectedUser.name,
      userEmail: selectedUser.email,
      role: 'team_member',
      permissions: { ...DEFAULT_TEAM_MEMBER_PERMISSIONS },
      addedAt: new Date().toISOString(),
      addedBy: user?.id ?? '',
    };

    const updated = [...(project.teamMembers || []), newMember];
    onUpdateProject({ teamMembers: updated });
    setAddMemberOpen(false);
    setSelectedUserId('');
    toast.success(t('team.memberAdded'));
  };

  const handleRemoveMember = (memberId: string) => {
    const updated = (project.teamMembers || []).filter((m) => m.id !== memberId);
    onUpdateProject({ teamMembers: updated });
    toast.success(t('team.memberRemoved'));
  };

  const handleUpdatePermissions = (permissions: ProjectPermissions) => {
    if (!editingMember) return;

    const updated = (project.teamMembers || []).map((m) =>
      m.id === editingMember.id ? { ...m, permissions } : m
    );
    onUpdateProject({ teamMembers: updated });
    setEditPermissionsOpen(false);
    setEditingMember(null);
    toast.success(t('team.permissionsUpdated'));
  };

  const teamMembers = project.teamMembers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('team.title')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{t('team.description')}</p>
        </div>
        {canManage && (
          <Button onClick={() => setAddMemberOpen(true)} className="bg-[#7A1516] hover:bg-[#5A1012]">
            <UserPlus className="w-4 h-4 mr-2" />
            {t('team.addMember')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('team.projectManager')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-[#7A1516]/5 rounded-lg border border-[#7A1516]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7A1516] text-white rounded-full flex items-center justify-center font-semibold">
                {project.assignedManagerName?.charAt(0) || 'PM'}
              </div>
              <div>
                <p className="font-medium">{project.assignedManagerName || 'Not Assigned'}</p>
                <Badge className="mt-1 bg-[#7A1516]">{t('team.fullAccess')}</Badge>
              </div>
            </div>
            <Shield className="w-5 h-5 text-[#7A1516]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('team.teamMembers')}</CardTitle>
          <CardDescription>
            {teamMembers.length} {t('team.members')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{t('team.noMembers')}</p>
              {canManage && (
                <Button variant="outline" onClick={() => setAddMemberOpen(true)} className="mt-4">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('team.addFirstMember')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-700">
                      {member.userName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.userName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <p className="text-sm text-gray-600">{member.userEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {member.permissions?.expenses && (
                          <Badge variant="outline" className="text-xs">
                            {t('team.expenses')}
                          </Badge>
                        )}
                        {member.permissions?.income && (
                          <Badge variant="outline" className="text-xs">
                            {t('team.income')}
                          </Badge>
                        )}
                        {member.permissions?.tasks && (
                          <Badge variant="outline" className="text-xs">
                            {t('team.tasks')}
                          </Badge>
                        )}
                        {member.permissions?.documents && (
                          <Badge variant="outline" className="text-xs">
                            {t('team.documents')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMember(member);
                          setEditPermissionsOpen(true);
                        }}
                      >
                        {t('team.permissions')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.addMember')}</DialogTitle>
            <DialogDescription>{t('team.addMemberDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('team.selectUser')}</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('team.selectUserPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers
                    .filter((u) => !teamMembers.some((m) => m.userId === u.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">{t('team.defaultPermissions')}</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ {t('team.documentsEnabled')}</li>
                <li>✓ {t('team.tasksEnabled')}</li>
                <li>✗ {t('team.expensesDisabled')}</li>
                <li>✗ {t('team.incomeDisabled')}</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">{t('team.canChangePermissions')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedUserId}
              className="bg-[#7A1516] hover:bg-[#5A1012]"
            >
              {t('team.addMember')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingMember && (
        <EditPermissionsDialog
          open={editPermissionsOpen}
          onClose={() => {
            setEditPermissionsOpen(false);
            setEditingMember(null);
          }}
          member={editingMember}
          onSave={handleUpdatePermissions}
        />
      )}
    </div>
  );
}

interface EditPermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  member: TeamMember;
  onSave: (permissions: ProjectPermissions) => void;
}

function EditPermissionsDialog({ open, onClose, member, onSave }: EditPermissionsDialogProps) {
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState<ProjectPermissions>(member.permissions ?? { ...DEFAULT_TEAM_MEMBER_PERMISSIONS });

  React.useEffect(() => {
    if (open) setPermissions(member.permissions ?? { ...DEFAULT_TEAM_MEMBER_PERMISSIONS });
  }, [open, member]);

  const handleToggle = (key: keyof ProjectPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    onSave(permissions);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('team.editPermissions')}</DialogTitle>
          <DialogDescription>
            {t('team.editPermissionsFor')} {member.userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <Label className="font-medium">{t('team.expenses')}</Label>
              <p className="text-sm text-gray-600 mt-1">{t('team.expensesDesc')}</p>
            </div>
            <Switch checked={permissions.expenses} onCheckedChange={() => handleToggle('expenses')} />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <Label className="font-medium">{t('team.income')}</Label>
              <p className="text-sm text-gray-600 mt-1">{t('team.incomeDesc')}</p>
            </div>
            <Switch checked={permissions.income} onCheckedChange={() => handleToggle('income')} />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <div className="flex-1">
              <Label className="font-medium flex items-center gap-2">
                {t('team.budget')}
                <Lock className="w-4 h-4 text-gray-400" />
              </Label>
              <p className="text-sm text-gray-600 mt-1">{t('team.budgetPMOnly')}</p>
            </div>
            <Switch checked={false} disabled />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <div className="flex-1">
              <Label className="font-medium">{t('team.documents')}</Label>
              <p className="text-sm text-gray-600 mt-1">{t('team.documentsAlwaysEnabled')}</p>
            </div>
            <Switch checked={true} disabled />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <div className="flex-1">
              <Label className="font-medium">{t('team.tasks')}</Label>
              <p className="text-sm text-gray-600 mt-1">{t('team.tasksAlwaysEnabled')}</p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} className="bg-[#7A1516] hover:bg-[#5A1012]">
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
