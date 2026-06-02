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

          <Route path="/unauthorized" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
