import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, Edit3, Key, CheckCircle2, XCircle, X, Search, ToggleLeft, ToggleRight, Users, Shield } from 'lucide-react';

const ROLES = ['User','Plant Head','Mechanical Team','Electrical Team','Purchase Team','GST Team','Store Head'];

const ROLE_BADGE = {
  'IT Team':'badge badge-purple','Plant Head':'badge badge-info','Purchase Team':'badge badge-info',
  'GST Team':'badge badge-pending','Store Head':'badge badge-approved',
  'Mechanical Team':'badge badge-sentback','Electrical Team':'badge badge-sentback',
  'User':'badge badge-default','Disabled':'badge badge-rejected',
};

const Skel = ({ w='w-full', h='h-3.5' }) => <div className={`skeleton ${w} ${h} rounded`} />;

const UserManagement = () => {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [formData, setFormData]   = useState({ full_name:'', username:'', email:'', password:'', role:'User', department:'' });

  const fetchUsers = async () => {
    try { const r = await api.get('/auth/users'); setUsers(Array.isArray(r.data)?r.data:[]); }
    catch { /* silent */ } finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editUser) await api.put(`/auth/users/${editUser.id}`, formData);
      else await api.post('/auth/users', formData);
      setShowModal(false); fetchUsers(); resetForm();
    } catch { alert('Error saving user'); }
  };

  const toggleActive = async (u) => {
    if (u.role === 'IT Team') return;
    try { await api.patch(`/auth/users/${u.id}/toggle-active`); fetchUsers(); }
    catch { alert('Failed to update status'); }
  };

  const resetPassword = async (id) => {
    const p = prompt('Enter new password:');
    if (!p) return;
    try { await api.patch(`/auth/users/${id}/reset-password`, { newPassword:p }); alert('Password updated'); }
    catch { alert('Failed to reset password'); }
  };

  const resetForm = () => {
    setFormData({ full_name:'', username:'', email:'', password:'', role:'User', department:'' });
    setEditUser(null);
  };

  const filtered = users.filter(u =>
    (u.full_name??'').toLowerCase().includes(search.toLowerCase()) ||
    (u.email??'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-sub">Manage system access, roles, and enterprise identity</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
          <UserPlus size={14} /> Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Users',  value:users.length,                           icon:Users,       cls:'text-blue-600 bg-blue-50' },
          { label:'Active',       value:users.filter(u=>u.is_active).length,    icon:CheckCircle2,cls:'text-emerald-600 bg-emerald-50' },
          { label:'Inactive',     value:users.filter(u=>!u.is_active).length,   icon:XCircle,     cls:'text-red-500 bg-red-50' },
        ].map(({ label, value, icon:Icon, cls }) => (
          <div key={label} className="card flex items-center gap-3 py-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}><Icon size={16} /></div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-[20px] font-black text-slate-800 leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card-flat overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input type="text" placeholder="Search by name or email..." className="input pl-9 text-[13px]"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <p className="text-[12px] text-slate-400 ml-auto">{filtered.length} users</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr>
              <th>User</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? [1,2,3,4].map(i => (
                <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j}><Skel w="w-full max-w-[120px]" /></td>)}</tr>
              )) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                        {(u.full_name||'?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-[13px]">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className={ROLE_BADGE[u.role]||'badge badge-default'}>{u.role}</span></td>
                  <td className="text-slate-500 text-[13px]">{u.department||'—'}</td>
                  <td>
                    {u.is_active
                      ? <span className="flex items-center gap-1.5 text-emerald-600 text-[12px] font-semibold"><CheckCircle2 size={12}/> Active</span>
                      : <span className="flex items-center gap-1.5 text-red-400 text-[12px] font-semibold"><XCircle size={12}/> Inactive</span>}
                  </td>
                  <td className="text-slate-400 text-[12px]">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'Never'}
                  </td>
                  <td>
                    <div className="flex justify-end items-center gap-1">
                      <button onClick={() => { setEditUser(u); setFormData({...u,password:''}); setShowModal(true); }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => resetPassword(u.id)}
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors" title="Reset Password">
                        <Key size={14} />
                      </button>
                      {u.role !== 'IT Team' && (
                        <button onClick={() => toggleActive(u)}
                          className={`p-1.5 rounded-lg transition-colors ${u.is_active?'hover:bg-red-50 text-red-500':'hover:bg-emerald-50 text-emerald-600'}`}
                          title={u.is_active?'Disable':'Enable'}>
                          {u.is_active ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan="6">
                  <div className="empty-state">
                    <div className="empty-icon"><Users size={18} className="text-slate-400" /></div>
                    <p className="text-[13px] text-slate-400">No users found</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal-panel max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Shield size={14} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-[14px]">{editUser?'Edit User':'Create New User'}</h2>
                  <p className="text-slate-400 text-[11px]">{editUser?'Update user details and permissions':'Add a new enterprise user account'}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={15} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name *</label>
                  <input className="input" required value={formData.full_name} onChange={e => setFormData({...formData,full_name:e.target.value})} placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Username *</label>
                  <input className="input" required value={formData.username} onChange={e => setFormData({...formData,username:e.target.value})} placeholder="john.smith" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Work Email *</label>
                <input type="email" className="input" required value={formData.email} onChange={e => setFormData({...formData,email:e.target.value})} placeholder="john@enterprise.com" />
              </div>
              {!editUser && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Initial Password *</label>
                  <input type="password" className="input" required value={formData.password} onChange={e => setFormData({...formData,password:e.target.value})} placeholder="••••••••" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Role *</label>
                  <select className="input" value={formData.role} onChange={e => setFormData({...formData,role:e.target.value})}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
                  <input className="input" value={formData.department} onChange={e => setFormData({...formData,department:e.target.value})} placeholder="e.g. Mechanical" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn btn-primary flex-1">{editUser?'Save Changes':'Create User'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary px-5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
