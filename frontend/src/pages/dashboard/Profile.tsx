import { useState, useEffect, useRef } from 'react';
import {
  User, Camera, Shield, Lock, Mail, Phone,
  Edit3, Save, X, Eye, EyeOff, Calendar, CheckCircle,
} from 'lucide-react';
import { usersApi, authApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  username: string;
  role: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  created_at?: string;
  last_login?: string;
  is_verified?: boolean;
}

// ─── Password strength indicator ──────────────────────────────────────────────

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;

  const strength =
    password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4
    : 3;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const barColors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const textColors = ['', 'text-red-400', 'text-yellow-400', 'text-blue-400', 'text-green-400'];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? barColors[strength] : 'bg-gray-400/20'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${textColors[strength]}`}>{labels[strength]}</p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatJoinDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { month: 'long', year: 'numeric' });
}

function timeAgo(d?: string): string {
  if (!d) return '—';
  const diff  = Date.now() - new Date(d).getTime();
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (hours < 1)  return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-RW', { month: 'short', day: '2-digit' });
}

const ROLE_BADGE: Record<string, string> = {
  admin:         'bg-[rgba(184,115,51,0.2)] text-[#b87333]',
  event_manager: 'bg-blue-500/20 text-blue-400',
  client:        'bg-gray-500/20 text-gray-400',
};

const INPUT_CLS = `w-full px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:ring-1 focus:ring-[rgba(184,115,51,0.3)] focus:outline-none
  text-sm bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82] transition-colors`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { refreshUser } = useAuth();
  const { toast }       = useToast();
  const fileRef         = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [pwSaving,    setPwSaving]    = useState(false);
  const [uploading,   setUploading]   = useState(false);

  const [form, setForm] = useState({ full_name: '', phone: '', bio: '' });
  const [pwForm, setPwForm] = useState({
    current_password: '', new_password: '', confirm_password: '',
  });
  const [showPw, setShowPw] = useState({
    current: false, new: false, confirm: false,
  });

  // ── Fetch profile ─────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res  = await usersApi.getProfile();
      const data = res.data as ProfileData;
      setProfileData(data);
      setForm({
        full_name: data.full_name ?? '',
        phone:     data.phone     ?? '',
        bio:       data.bio       ?? '',
      });
    } catch {
      toast({ title: 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // ── Save profile info ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: 'Full name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res  = await usersApi.updateProfile(form);
      const data = res.data as ProfileData;
      setProfileData(data);
      setEditing(false);
      await refreshUser(); // Update global auth context
      toast({ title: '✅ Profile updated successfully' });
    } catch (err: any) {
      toast({
        title: 'Failed to update profile',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword({
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      toast({ title: '✅ Password changed successfully' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      toast({
        title: 'Failed to change password',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setPwSaving(false);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be smaller than 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await usersApi.uploadAvatar(fd);
      const data = res.data as ProfileData;
      setProfileData((prev) => prev ? { ...prev, avatar: data.avatar } : prev);
      await refreshUser();
      toast({ title: '✅ Avatar updated' });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[rgba(184,115,51,0.2)] border-t-[#b87333] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileData) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Profile header with cover + avatar ──────────────────────────── */}
      <div className="relative mb-16">
        {/* Cover banner */}
        <div
          className="h-44 rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1a1a1a,#242424,#b87333/20)' }}
        >
          <div className="w-full h-full" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(184,115,51,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(212,149,106,0.1) 0%, transparent 50%)',
          }} />
        </div>

        {/* Avatar */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full ring-4 ring-[#b87333] overflow-hidden bg-[rgba(184,115,51,0.2)] flex items-center justify-center">
              {profileData.avatar ? (
                <img src={profileData.avatar} alt={profileData.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-[#b87333]">
                  {profileData.full_name.charAt(0).toUpperCase()}
                </span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Change avatar"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
              style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
        </div>

        {/* Name + role below avatar */}
        <div className="absolute -bottom-10 left-36 sm:left-40">
          <p className="text-lg font-bold text-[#f5f0e8]">{profileData.full_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_BADGE[profileData.role] ?? 'bg-gray-500/20 text-gray-400'}`}>
              {profileData.role.replace('_', ' ')}
            </span>
            {profileData.is_verified && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Profile info card ──────────────────────────────────────────── */}
        <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[#f5f0e8] flex items-center gap-2">
              <User className="w-4 h-4 text-[#b87333]" /> Profile Information
            </h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-sm text-[#b87333] hover:underline transition-colors"
              >
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setForm({ full_name: profileData.full_name, phone: profileData.phone ?? '', bio: profileData.bio ?? '' }); }}
                  className="flex items-center gap-1.5 text-sm text-[#9a8f82] hover:text-[#f5f0e8] transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Full Name *</label>
                <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className={INPUT_CLS} />
              </div>
              <div>
                <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Phone</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT_CLS} placeholder="+250 7XX XXX XXX" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={3} className={`${INPUT_CLS} resize-none`} placeholder="Tell us a bit about yourself…" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {([
                ['Full Name', profileData.full_name,     User  ],
                ['Email',     profileData.email,         Mail  ],
                ['Phone',     profileData.phone || '—',  Phone ],
                ['Bio',       profileData.bio   || '—',  Edit3 ],
              ] as [string, string, React.ElementType][]).map(([label, value, Icon]) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-[#b87333] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#9a8f82]">{label}</p>
                    <p className="text-sm text-[#f5f0e8] mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Change password card ───────────────────────────────────────── */}
        <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6">
          <h2 className="font-bold text-[#f5f0e8] flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-[#b87333]" /> Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {([
              { key: 'current_password', label: 'Current Password', showKey: 'current' as const },
              { key: 'new_password',     label: 'New Password',     showKey: 'new'     as const },
              { key: 'confirm_password', label: 'Confirm Password', showKey: 'confirm' as const },
            ]).map(({ key, label, showKey }) => (
              <div key={key}>
                <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">{label}</label>
                <div className="relative">
                  <input
                    type={showPw[showKey] ? 'text' : 'password'}
                    value={pwForm[key as keyof typeof pwForm]}
                    onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={`${INPUT_CLS} pr-10`}
                    required
                    autoComplete={key === 'current_password' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => ({ ...p, [showKey]: !p[showKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#f5f0e8] transition-colors"
                  >
                    {showPw[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {key === 'new_password' && <StrengthBar password={pwForm.new_password} />}
                {key === 'confirm_password' && pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={pwSaving || (!!pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password)}
              className="w-full py-2.5 text-white text-sm rounded-xl font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
            >
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* ── Account info card ──────────────────────────────────────────── */}
        <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6">
          <h2 className="font-bold text-[#f5f0e8] flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-[#b87333]" /> Account Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ['Email',        profileData.email,                                    Mail         ],
              ['Username',     `@${profileData.username}` || '—',                   User         ],
              ['Role',         profileData.role.replace('_', ' '),                  Shield       ],
              ['Member Since', formatJoinDate(profileData.created_at),              Calendar     ],
              ['Last Login',   timeAgo(profileData.last_login),                     CheckCircle  ],
              ['Status',       profileData.is_verified ? 'Verified ✓' : 'Unverified', Shield    ],
            ] as [string, string, React.ElementType][]).map(([label, value, Icon]) => (
              <div
                key={label}
                className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(184,115,51,0.15)] bg-[#1a1a1a]"
              >
                <Icon className="w-4 h-4 text-[#b87333] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[#9a8f82]">{label}</p>
                  <p className="text-sm text-[#f5f0e8] font-medium capitalize truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
