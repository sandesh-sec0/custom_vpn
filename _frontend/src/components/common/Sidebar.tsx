/**
 * Sidebar — Left navigation panel
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  UserCircle,
  Shield,
  FileText,
  X,
  Server,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-dashboard', to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'nav-sessions', to: '/sessions', label: 'Sessions', icon: <Activity size={18} />, adminOnly: true },
  { id: 'nav-users', to: '/users', label: 'Users', icon: <Users size={18} />, adminOnly: true },
  { id: 'nav-services', to: '/services', label: 'Services', icon: <Server size={18} />, adminOnly: true },
  { id: 'nav-audit', to: '/audit-logs', label: 'Audit Log', icon: <FileText size={18} />, adminOnly: true },
  { id: 'nav-profile', to: '/profile', label: 'Profile', icon: <UserCircle size={18} /> },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const items = NAV_ITEMS.filter(item => !item.adminOnly || user?.is_admin);

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 1rem',
    borderRadius: '0.5rem',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isActive ? '#06b6d4' : 'var(--text-secondary)',
    background: isActive ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
    border: isActive ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid transparent',
    transition: 'all 150ms',
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            display: 'none',
          }}
          className="sidebar-overlay"
        />
      )}

      {/* Sidebar panel */}
      <aside
        style={{
          width: isOpen ? '240px' : '0',
          minWidth: isOpen ? '240px' : '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-main)',
          borderRight: '1px solid var(--border-color)',
          transition: 'width 250ms cubic-bezier(0.4,0,0.2,1), min-width 250ms cubic-bezier(0.4,0,0.2,1)',
          height: '100%',
          position: 'sticky',
          top: 0,
        }}
      >
        <div className="flex h-full flex-col p-4">
          {/* Nav items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
            {items.map(item => (
              <NavLink
                key={item.to}
                id={item.id}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => navLinkStyle(isActive)}
              >
                {item.icon}
                <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom: user info */}
          {user && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {user.username}
              </p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {user.email}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
