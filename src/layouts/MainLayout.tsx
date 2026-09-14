import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import { dashboardApi } from '../api/dashboardApi';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Sidebar collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('careerx_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Mobile drawer open state
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Live database-backed badge counts
  const [applicationsCount, setApplicationsCount] = useState<number>(0);
  const [messagesCount, setMessagesCount] = useState<number>(0);
  const [notificationsCount, setNotificationsCount] = useState<number>(0);

  const fetchBadgeStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await dashboardApi.getOverview();
      const activeApps =
        data.applications.active !== undefined
          ? data.applications.active
          : Math.max(0, data.applications.total - data.applications.rejected);

      setApplicationsCount(activeApps);
      setMessagesCount(data.unreadMessagesCount ?? 0);
      setNotificationsCount(data.unreadNotificationsCount ?? 0);
    } catch (err) {
      console.error('Failed to fetch badge stats:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchBadgeStats();

    const handleRefresh = () => {
      fetchBadgeStats();
    };

    window.addEventListener('careerx:refresh_dashboard', handleRefresh);
    return () => {
      window.removeEventListener('careerx:refresh_dashboard', handleRefresh);
    };
  }, [fetchBadgeStats]);

  useEffect(() => {
    localStorage.setItem('careerx_sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-[#F3F2EF] text-[#1D2226] flex flex-col antialiased selection:bg-[#E8F3FF] selection:text-[#0A66C2] overflow-x-hidden">
      {/* Fixed Left Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        applicationsCount={applicationsCount}
        messagesCount={messagesCount}
        notificationsCount={notificationsCount}
      />

      {/* Sticky Top Navigation Bar */}
      <Topbar
        onOpenMobileSidebar={() => setIsMobileOpen(true)}
        isSidebarCollapsed={isCollapsed}
        messagesCount={messagesCount}
        notificationsCount={notificationsCount}
      />

      {/* Main Content Area - Laptop-First Responsive Offset */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 ease-in-out',
          // Desktop left padding matching sidebar width: 240px on laptop, 256px on large screens
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-60 laptop-lg:pl-64'
        )}
      >
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
