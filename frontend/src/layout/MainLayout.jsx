import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = () => (
  <div
    className="min-h-screen flex"
    style={{
      background: '#f1f5f9', // Very light clean gray/blue background
    }}
  >
    <Sidebar />
    <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: '220px' }}>
      <Topbar />
      <main
        className="flex-1 overflow-hidden"
        style={{ marginTop: '52px' }}
      >
        <div className="h-full w-full">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);

export default MainLayout;
