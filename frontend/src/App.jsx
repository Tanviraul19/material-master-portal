 import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import MaterialRequestForm from './pages/MaterialRequestForm';
import MyRequests from './pages/MyRequests';
import MaterialImport from './pages/MaterialImport';
import Approvals from './pages/Approvals';
import Settings from './pages/Settings';
import { ThemeProvider } from './context/ThemeContext';

const DashboardRedirect = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (['IT Team', 'Super Admin', 'Admin'].includes(user.role)) {
    return <Dashboard />;
  }
  
  if (user.role === 'User') {
    return <Navigate to="/requests/my" replace />;
  }
  
  return <Navigate to="/approvals" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<ErrorBoundary><DashboardRedirect /></ErrorBoundary>} />
              
              {/* IT Team & Admin Restricted */}
              <Route element={<ProtectedRoute allowedRoles={['IT Team', 'Super Admin', 'Admin']} />}>
                 <Route path="/users" element={<ErrorBoundary><UserManagement /></ErrorBoundary>} />
                 <Route path="/import" element={<ErrorBoundary><MaterialImport /></ErrorBoundary>} />
              </Route>

              {/* User Only Restricted */}
              <Route element={<ProtectedRoute allowedRoles={['User']} />}>
                 <Route path="/request/new" element={<ErrorBoundary><MaterialRequestForm /></ErrorBoundary>} />
              </Route>

              {/* My Requests — accessible by all roles (email links redirect here) */}
              <Route element={<ProtectedRoute allowedRoles={['User', 'IT Team', 'Super Admin', 'Admin', 'Plant Head', 'Store Head', 'Purchase Team', 'Mechanical Team', 'Electrical Team', 'GST Team']} />}>
                 <Route path="/requests/my" element={<ErrorBoundary><MyRequests /></ErrorBoundary>} />
              </Route>

              {/* Workflow Processing Roles */}
              <Route element={<ProtectedRoute allowedRoles={['IT Team', 'Super Admin', 'Admin', 'Plant Head', 'Store Head', 'Purchase Team', 'Mechanical Team', 'Electrical Team', 'GST Team', 'Department']} />}>
                 <Route path="/approvals" element={<ErrorBoundary><Approvals /></ErrorBoundary>} />
              </Route>
              
              <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
            </Route>
          </Route>

          <Route path="/unauthorized" element={
            <div className="h-screen flex flex-col items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h1 className="text-2xl font-black text-red-500 mb-2">403 — Unauthorized Access</h1>
                <p className="text-slate-500 text-sm mb-6">
                  You don't have permission to view this page.<br/>
                  You may be logged in with a different account.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { localStorage.removeItem('user'); window.location.href = '/login'; }}
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Sign Out &amp; Login Again
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-all"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
