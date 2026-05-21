import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, Filter, ArrowUpDown, ChevronRight, 
  Search, Download, MoreHorizontal 
} from 'lucide-react';

const RequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/requests');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'APPROVED') return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (status === 'REJECTED') return 'text-rose-600 bg-rose-50 border-rose-100';
    if (status.startsWith('PENDING')) return 'text-blue-600 bg-blue-50 border-blue-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Material Master Requests</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage all your material creation requests.</p>
        </div>
        <div className="flex items-center space-x-3">
           <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
             <Download className="w-4 h-4" />
             <span>Export</span>
           </button>
           <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
             <Filter className="w-4 h-4" />
             <span>Filters</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by description..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
           </div>
           <div className="flex items-center space-x-2 text-slate-400 text-sm font-medium">
              <span>Sorted by</span>
              <button className="text-slate-700 flex items-center space-x-1">
                <span>Date Created</span>
                <ArrowUpDown className="w-3 h-3" />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Material Details</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Plant / S.Loc</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Created By</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-12 text-center text-slate-400 font-medium">Loading requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-12 text-center text-slate-400 font-medium italic">No requests found.</td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold font-mono text-slate-400">MR-{req.id.substring(0, 6).toUpperCase()}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{req.description}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">{req.material_type} • {req.uom}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-2">
                       <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{req.plant}</span>
                       <ChevronRight className="w-3 h-3 text-slate-300" />
                       <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{req.storage_location}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-2">
                       <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-bold text-indigo-600">
                         {req.Creator?.name?.charAt(0)}
                       </div>
                       <span className="text-xs font-medium text-slate-600">{req.Creator?.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-2">
                       <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all" title="View Details">
                         <Eye className="w-4 h-4" />
                       </button>
                       <button className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all">
                         <MoreHorizontal className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <p className="text-xs font-medium text-slate-400">Showing {requests.length} materials</p>
           <div className="flex items-center space-x-1">
              <button className="px-3 py-1 border border-slate-200 rounded bg-white text-xs font-bold text-slate-400 disabled:opacity-50" disabled>Prev</button>
              <button className="px-3 py-1 border border-blue-200 rounded bg-blue-50 text-xs font-bold text-blue-600">1</button>
              <button className="px-3 py-1 border border-slate-200 rounded bg-white text-xs font-bold text-slate-400 disabled:opacity-50" disabled>Next</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RequestList;
筋
