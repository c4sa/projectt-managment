import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { User, Lock, Save, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSettingsDialog({ open, onOpenChange }: ProfileSettingsDialogProps) {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();

  const loadProfile = () => {
    try {
      const stored = localStorage.getItem('core_code_profile');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { name: user?.name || '', email: user?.email || '', phone: '', photoBase64: '' };
  };

  const [profile, setProfile] = useState(loadProfile);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfile((prev: typeof profile) => ({ ...prev, photoBase64: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleSaveProfile = () => {
    localStorage.setItem('core_code_profile', JSON.stringify(profile));
    toast.success('Profile updated successfully');
    onOpenChange(false);
  };

  const handleChangePassword = () => {
    if (password.new !== password.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (password.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    localStorage.setItem('core_code_password_set', 'true');
    toast.success('Password changed successfully');
    setPassword({ current: '', new: '', confirm: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Globe className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="password">
              <Lock className="w-4 h-4 mr-2" />
              Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-6 mb-6">
                {profile.photoBase64 ? (
                  <img src={profile.photoBase64} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-[#7A1516]" />
                ) : (
                  <div className="w-20 h-20 bg-[#7A1516] text-white rounded-full flex items-center justify-center text-3xl font-semibold">
                    {profile.name?.charAt(0) || user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Change Photo</span>
                    <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG. Max 2MB</p>
                </div>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+966 XX XXX XXXX"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} className="bg-[#7A1516] hover:bg-[#5A1012]">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <div className="space-y-4 max-w-lg">
              <div>
                <h3 className="text-lg font-semibold mb-4">Language & Regional Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Display Language</Label>
                    <div className="flex gap-3">
                      <Button
                        variant={language === 'en' ? 'default' : 'outline'}
                        className={language === 'en' ? 'bg-[#7A1516] hover:bg-[#5A1012]' : ''}
                        onClick={() => {
                          setLanguage('en');
                          toast.success('Language changed to English');
                        }}
                      >
                        English
                      </Button>
                      <Button
                        variant={language === 'ar' ? 'default' : 'outline'}
                        className={language === 'ar' ? 'bg-[#7A1516] hover:bg-[#5A1012]' : ''}
                        onClick={() => {
                          setLanguage('ar');
                          toast.success('تم تغيير اللغة إلى العربية');
                        }}
                      >
                        العربية
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      {language === 'en' 
                        ? 'Choose your preferred language for the interface. RTL layout will be automatically applied for Arabic.'
                        : 'اختر لغتك المفضلة للواجهة. سيتم تطبيق تخطيط RTL تلقائياً للعربية.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="password" className="mt-6">
            <div className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleChangePassword} className="bg-[#7A1516] hover:bg-[#5A1012]">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}