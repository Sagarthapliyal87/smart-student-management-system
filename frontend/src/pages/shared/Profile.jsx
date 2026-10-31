import { useState } from 'react';
import { api, getErrorMessage, UPLOADS_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Name cannot be empty.', 'error');
    setBusy('profile');
    try { await api.put('/users/me', form); await refreshUser(); showToast('Profile updated.'); }
    catch (err) { showToast(getErrorMessage(err), 'error'); }
    finally { setBusy(''); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) return showToast('New password must be at least 8 characters.', 'error');
    if (pw.newPassword !== pw.confirm) return showToast('New password and confirmation do not match.', 'error');
    setBusy('pw');
    try {
      await api.put('/users/me', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      showToast('Password changed.');
    } catch (err) { showToast(getErrorMessage(err), 'error'); }
    finally { setBusy(''); }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('photo', file);
    setBusy('photo');
    try { await api.post('/users/me/photo', fd); await refreshUser(); showToast('Photo updated.'); }
    catch (err) { showToast(getErrorMessage(err), 'error'); }
    finally { setBusy(''); }
  };

  const extra = user.student ? [['Roll number', user.student.rollNumber], ['Class', user.student.class ? `${user.student.class.course.name} - Sem ${user.student.class.semester} ${user.student.class.section}` : 'Not assigned']]
    : user.teacher ? [['Department', user.teacher.department], ['Designation', user.teacher.designation || '-']]
    : user.parent ? [['Occupation', user.parent.occupation || '-']] : [];

  return (
    <>
      <PageHeader title="My Profile" />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          {user.profilePhoto
            ? <img src={`${UPLOADS_BASE_URL}${user.profilePhoto}`} alt="Profile" className="w-24 h-24 rounded-full object-cover mx-auto" />
            : <div className="w-24 h-24 rounded-full bg-brand-600 text-white text-3xl font-bold flex items-center justify-center mx-auto">{user.name[0]}</div>}
          <p className="font-semibold mt-3">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <div className="mt-2"><Badge status={user.role} /></div>
          <label className="btn-secondary inline-block mt-4 cursor-pointer">
            {busy === 'photo' ? 'Uploading...' : 'Change photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadPhoto(e.target.files[0])} />
          </label>
          <p className="text-xs text-gray-400 mt-2">JPG, PNG or WebP, up to 10 MB</p>
          {extra.length > 0 && (
            <dl className="text-left text-sm mt-5 space-y-1 border-t border-gray-100 pt-3">
              {extra.map(([k, v]) => <div key={k} className="flex justify-between gap-2"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-right">{v}</dd></div>)}
            </dl>
          )}
        </div>
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={saveProfile} className="card space-y-4">
            <h2 className="font-semibold">Personal details</h2>
            <div><label className="label">Full name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <button className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving...' : 'Save changes'}</button>
          </form>
          <form onSubmit={changePassword} className="card space-y-4">
            <h2 className="font-semibold">Change password</h2>
            <div><label className="label">Current password</label><input type="password" className="input-field" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">New password</label><input type="password" className="input-field" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></div>
              <div><label className="label">Confirm new password</label><input type="password" className="input-field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></div>
            </div>
            <button className="btn-primary" disabled={busy === 'pw'}>{busy === 'pw' ? 'Updating...' : 'Update password'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
