import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/authStore';

// Layouts
import AppLayout from './components/shared/AppLayout';
import AdminLayout from './components/admin/AdminLayout';

// Auth pages
import LandingPage from './pages/user/LandingPage';
import LoginPage from './pages/user/LoginPage';
import RegisterPage from './pages/user/RegisterPage';
import ForgotPasswordPage from './pages/user/ForgotPasswordPage';

// User pages
import DashboardPage from './pages/user/DashboardPage';
import MeetingsPage from './pages/user/MeetingsPage';
import MeetingDetailPage from './pages/user/MeetingDetailPage';
import UploadMeetingPage from './pages/user/UploadMeetingPage';
import TasksPage from './pages/user/TasksPage';
import CalendarPage from './pages/user/CalendarPage';
import AnalyticsPage from './pages/user/AnalyticsPage';
import SearchPage from './pages/user/SearchPage';
import SettingsPage from './pages/user/SettingsPage';
import NotificationsPage from './pages/user/NotificationsPage';
import TeamPage from './pages/user/TeamPage';

// New pages
import LiveMeetingPage from './pages/user/LiveMeetingPage';
import LiveRoomPage from './pages/user/LiveRoomPage';
import AICoachPage from './pages/user/AICoachPage';
import AgendaBuilderPage from './pages/user/AgendaBuilderPage';
import MeetingInsightsPage from './pages/user/MeetingInsightsPage';
import ActionTrackerPage from './pages/user/ActionTrackerPage';
import SecondBrainPage from './pages/user/SecondBrainPage';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminMeetingsPage from './pages/admin/AdminMeetingsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminSystemPage from './pages/admin/AdminSystemPage';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !['admin','superadmin'].includes(user?.role))
    return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

export default function App() {
  const { initialize } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      {/* Live room — fullscreen, outside AppLayout */}
      <Route path="/live/:roomCode" element={<ProtectedRoute><LiveRoomPage /></ProtectedRoute>} />

      {/* User app */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard"        element={<DashboardPage />} />
        <Route path="meetings"         element={<MeetingsPage />} />
        <Route path="meetings/upload"  element={<UploadMeetingPage />} />
        <Route path="meetings/:id"     element={<MeetingDetailPage />} />
        <Route path="tasks"            element={<TasksPage />} />
        <Route path="calendar"         element={<CalendarPage />} />
        <Route path="analytics"        element={<AnalyticsPage />} />
        <Route path="search"           element={<SearchPage />} />
        <Route path="notifications"    element={<NotificationsPage />} />
        <Route path="team"             element={<TeamPage />} />
        <Route path="settings"         element={<SettingsPage />} />
        {/* NEW modules */}
        <Route path="live"             element={<LiveMeetingPage />} />
        <Route path="ai-coach"         element={<AICoachPage />} />
        <Route path="agenda"           element={<AgendaBuilderPage />} />
        <Route path="insights"         element={<MeetingInsightsPage />} />
        <Route path="action-tracker"   element={<ActionTrackerPage />} />
        <Route path="second-brain"     element={<SecondBrainPage />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users"     element={<AdminUsersPage />} />
        <Route path="meetings"  element={<AdminMeetingsPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="system"    element={<AdminSystemPage />} />
        <Route path="settings"  element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
