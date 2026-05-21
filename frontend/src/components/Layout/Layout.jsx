import { useAuth } from '../../context/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FilePlus, List, Users, LogOut, 
  Settings, Bell, Search, User as UserIcon 
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['ADMIN', 'USER', 'PLANT_HEAD', 'DEPT_TEAM', 'PURCHASE_TEAM', 'GST_TEAM', 'STORE_HEAD', 'IT_TEAM'] },
    { name: 'New Request', icon: FilePlus, path: '/create-request', roles: ['USER', 'ADMIN'] },
    { name: 'Request List', icon: List, path: '/requests', roles: ['ADMIN', 'USER', 'PLANT_HEAD', 'DEPT_TEAM', 'PURCHASE_TEAM', 'GST_TEAM', 'STORE_HEAD', 'IT_TEAM'] },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ name: 'User Management', icon: Users, path: '/admin/users', roles: ['ADMIN'] });
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#001e30] text-slate-300 flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center font-bold text-white">M</div>
          <span className="text-lg font-bold text-white tracking-tight">Material Master</span>
        </div>
        
        <nav className="flex-1 mt-6">
          {navItems.filter(item => item.roles.includes(user?.role)).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center px-6 py-3.5 transition-all duration-200 group ${
                  isActive ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : 'hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-4" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-700/50">
          <button 
            onClick={handleLogout}
            className="flex items-center text-slate-400 hover:text-white w-full transition-colors group"
          >
            <LogOut className="w-5 h-5 mr-4 group-hover:translate-x-1 transition-transform" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search requests..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <button className="relative text-slate-500 hover:text-blue-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center space-x-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700 leading-none">{user?.name}</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-blue-500/20 shadow-lg">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

