import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import { cn } from '../utils/cn';

export const MainLayout: React.FC = () => {
  // Sidebar collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('careerx_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Mobile drawer open state
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

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
      />

      {/* Sticky Top Navigation Bar */}
      <Topbar
        onOpenMobileSidebar={() => setIsMobileOpen(true)}
        isSidebarCollapsed={isCollapsed}
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
