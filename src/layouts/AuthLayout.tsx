import React from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ShieldCheck, Code2, Briefcase } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F2EF] flex items-center justify-center">
        <div className="w-8 h-8 rounded-xl bg-[#0A66C2] animate-pulse" />
      </div>
    );
  }

  // If already logged in, redirect to dashboard or previous destination
  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] text-[#1D2226] flex flex-col justify-between overflow-x-hidden selection:bg-[#E8F3FF] selection:text-[#0A66C2]">
      {/* Top Header */}
      <header className="h-14 px-6 sm:px-10 flex items-center justify-between border-b border-[#D9D9D9] bg-white/80 backdrop-blur-md">
        <Link to="/login" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-xl bg-[#0A66C2] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#1D2226] font-sans">
            Career<span className="text-[#0A66C2]">X</span>
          </span>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#E8F3FF] text-[#0A66C2] border border-[#d0e6fc]">
            PRO
          </span>
        </Link>

        <span className="text-xs text-[#56687A] font-medium hidden sm:inline-block">
          AI-Powered Career & Engineering Platform
        </span>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Platform Branding & Value Highlights (Laptop 1366px+) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center space-y-6 pr-4">
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#0A66C2] bg-[#E8F3FF] border border-[#d0e6fc] px-2.5 py-1 rounded-full inline-block">
                For High-Impact Engineers
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1D2226] tracking-tight leading-snug">
                Your entire engineering career workflow in one platform.
              </h2>
              <p className="text-xs sm:text-sm text-[#56687A] leading-relaxed">
                Join thousands of software engineers using CareerX to optimize ATS resumes, solve DSA in Monaco IDE, and track interviews at top tech companies.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                {
                  icon: ShieldCheck,
                  title: 'AI ATS Screening Optimizer',
                  desc: '4-pillar scoring engine and STAR bullet enhancer.',
                },
                {
                  icon: Code2,
                  title: 'Embedded Monaco IDE',
                  desc: 'Run DSA problems in Python, Go, JS, TS, and Java.',
                },
                {
                  icon: Briefcase,
                  title: 'Kanban Application Tracker',
                  desc: 'Never miss an interview loop, assessment, or offer deadline.',
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#D9D9D9] shadow-sm hover:border-[#0A66C2]/40 transition">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2] flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1D2226]">{item.title}</h4>
                      <p className="text-[11px] text-[#56687A] leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Form View (Outlet) */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="h-12 border-t border-[#D9D9D9] px-6 flex items-center justify-center text-[11px] text-[#788896]">
        <span>© {new Date().getFullYear()} CareerX Technologies. Secure JWT Authentication.</span>
      </footer>
    </div>
  );
};

export default AuthLayout;
