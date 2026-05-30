/**
 * AppLayout — Shell wrapping Header + Sidebar + page content
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Toaster } from './Toaster';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '1.5rem 2rem',
            background: 'var(--bg-main)',
          }}
        >
          <div className="animate-fade-in" style={{ margin: '0 auto', maxWidth: '1280px', width: '100%' }}>
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
