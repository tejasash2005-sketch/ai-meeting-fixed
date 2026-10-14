import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Video, CheckSquare, Calendar, BarChart3,
  Search, Bell, Settings, Users, LogOut, Menu, X,
  Mic, ChevronRight, Shield, Radio, Brain, ListOrdered,
  Lightbulb, ClipboardList
} from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/meetings',      icon: Video,           label: 'Meetings' },
  { to: '/live',          icon: Radio,           label: 'Live Meetings',  badge: 'NEW' },
  { to: '/tasks',         icon: CheckSquare,     label: 'Tasks' },
  { to: '/calendar',      icon: Calendar,        label: 'Calendar' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytics' },
  { to: '/search',        icon: Search,          label: 'Search' },
  { to: '/team',          icon: Users,           label: 'Team' },
];

const aiModules = [
  { to: '/second-brain',   icon: Brain,          label: 'Second Brain',   badge: 'AI+' },
  { to: '/ai-coach',       icon: Brain,          label: 'AI Coach',       badge: 'AI' },
  { to: '/agenda',         icon: ListOrdered,    label: 'Agenda Builder', badge: 'AI' },
  { to: '/insights',       icon: Lightbulb,      label: 'Insights',       badge: 'AI' },
  { to: '/action-tracker', icon: ClipboardList,  label: 'Action Tracker', badge: 'AI' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data.data),
    refetchInterval: 30000,
    retry: false,
  });

  const unreadCount = notifData?.count || 0;

  const NavItem = ({ item }) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
      onClick={() => setSidebarOpen(false)}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
          item.badge === 'AI' ? 'bg-purple-100 text-purple-700' :
          item.badge === 'NEW' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>{item.badge}</span>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight">AI Meeting</p>
            <p className="text-xs text-slate-500">Intelligence</p>
          </div>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
          {/* Main nav */}
          {navItems.map(item => <NavItem key={item.to} item={item} />)}

          {/* Upload CTA */}
          <div className="pt-3 mt-2 border-t border-slate-100">
            <button
              onClick={() => { navigate('/meetings/upload'); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Video className="w-4 h-4 flex-shrink-0" />
              Upload Recording
              <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
            </button>
          </div>

          {/* AI Modules section */}
          <div className="pt-3 mt-2 border-t border-slate-100">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">AI Modules</p>
            {aiModules.map(item => <NavItem key={item.to} item={item} />)}
          </div>

          {/* Admin link */}
          {['admin','superadmin'].includes(user?.role) && (
            <div className="pt-2 mt-2 border-t border-slate-100">
              <NavLink to="/admin" className="sidebar-item">
                <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
                Admin Panel
              </NavLink>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 p-2 flex-shrink-0">
          <NavLink to="/settings" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer mb-1 transition-colors">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500 capitalize truncate">{user?.role}</p>
            </div>
          </NavLink>
          <button onClick={logout} className="sidebar-item w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1" />
          <button onClick={() => navigate('/search')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/settings')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
