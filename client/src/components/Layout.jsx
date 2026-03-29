import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  Bell,
  Users,
  Settings
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'], section: 'Main' },
  { path: '/expenses', label: 'Expenses', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'], section: 'Main' },
  { path: '/approvals', label: 'Approvals', icon: CheckSquare, roles: ['ADMIN', 'MANAGER'], section: 'Main' },
  { path: '/notifications', label: 'Notifications', icon: Bell, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'], section: 'Main' },
  { path: '/users', label: 'Users', icon: Users, roles: ['ADMIN'], section: 'Admin' },
  { path: '/rules', label: 'Approval Rules', icon: Settings, roles: ['ADMIN'], section: 'Admin' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role));
  const sections = [...new Set(filteredNav.map(n => n.section))];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-bg">

      {/* Sidebar */}
      <aside className="w-[240px] min-h-screen bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] border-r border-border flex flex-col shrink-0 p-4 pt-6">

        {/* Logo */}
        <div className="px-2 mb-8">
          <div className="font-['Syne'] text-[18px] font-extrabold text-accent2 tracking-wide">
            Expense<span className="text-white">Flow</span>
          </div>
          <span className="text-[11px] text-muted tracking-wide">
            {user?.company?.name || 'Workspace'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-2">
          {sections.map(section => (
            <div key={section} className="mb-[26px]">
              <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#6b6b7d] px-1 mb-[14px]">
                {section}
              </div>

              {filteredNav
                .filter(n => n.section === section)
                .map(item => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group flex items-center gap-[14px] px-3 py-2.5 rounded-[12px] mb-1.5 transition-all duration-200 no-underline
                      ${isActive
                          ? 'bg-[#261f4c] text-[#b3a8ff]'
                          : 'text-[#d6d6e0] hover:bg-[#1f1f2e] hover:text-white'
                        }`}
                    >
                      <div className={`w-[32px] h-[32px] rounded-[8px] flex items-center justify-center shrink-0 transition-colors
                        ${isActive ? 'bg-[#5041a8] text-white shadow-sm' : 'bg-[#292936] text-[#868696] group-hover:bg-[#323240] group-hover:text-white'}`}>
                        <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className={`text-[15px] ${isActive ? 'font-semibold tracking-[0.2px]' : 'font-medium'}`}>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-border">

          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[13px] font-bold text-white">
              {user?.firstName?.[0]}
            </div>

            <div className="min-w-0">
              <div className="text-[13px] font-semibold truncate text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[11px] text-gray-400">
                {user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[13px] font-medium transition-all duration-200 hover:bg-red-500/10 hover:border-red-400 hover:text-red-400"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}