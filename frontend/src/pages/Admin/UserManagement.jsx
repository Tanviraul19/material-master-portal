import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { 
  UserPlus, Shield, Mail, Key, 
  Trash2, Edit3, MoreVertical, Search
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system access, roles, and department assignments.</p>
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:-translate-y-1">
          <UserPlus className="w-5 h-5" />
          <span>Add New User</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
           <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name, email or role..." 
                className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
           {loading ? (
             <div className="col-span-full py-12 text-center text-slate-400 font-medium">Loading user database...</div>
           ) : users.map(user => (
             <div key={user.id} className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
                <div className="flex items-start justify-between mb-6">
                   <div className="w-14 h-14 bg-gradient-to-br from-slate-200 to-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">
                      {user.name.charAt(0)}
                   </div>
                   <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                      <MoreVertical className="w-5 h-5" />
                   </button>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
                <div className="flex items-center text-xs font-bold text-indigo-500 bg-indigo-50 w-fit px-2 py-1 rounded-lg mt-1 uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">
                   <Shield className="w-3 h-3 mr-1.5" />
                   {user.role}
                </div>

                <div className="mt-6 space-y-3">
                   <div className="flex items-center space-x-3 text-slate-500">
                      <Mail className="w-4 h-4 opacity-50" />
                      <span className="text-sm font-medium">{user.email}</span>
                   </div>
                   <div className="flex items-center space-x-3 text-slate-500">
                      <Key className="w-4 h-4 opacity-50" />
                      <span className="text-sm font-medium">@{user.username}</span>
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                   <button className="text-blue-600 font-bold text-xs uppercase tracking-widest flex items-center hover:underline">
                      <Edit3 className="w-3 h-3 mr-1.5" />
                      Edit
                   </button>
                   <button className="text-rose-400 font-bold text-xs uppercase tracking-widest flex items-center hover:text-rose-600 transition-colors">
                      <Trash2 className="w-3 h-3 mr-1.5" />
                      Deactivate
                   </button>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
筋
