import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Lazy-load every page so each gets its own chunk
const AdminPage              = lazy(() => import('../pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ApplicationsPage       = lazy(() => import('../pages/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })));
const CalendarPage           = lazy(() => import('../pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const CodingPracticePage     = lazy(() => import('../pages/CodingPracticePage').then(m => ({ default: m.CodingPracticePage })));
const CompaniesPage          = lazy(() => import('../pages/CompaniesPage').then(m => ({ default: m.CompaniesPage })));
const FeedPage               = lazy(() => import('../pages/FeedPage').then(m => ({ default: m.FeedPage })));
const ForgotPasswordPage     = lazy(() => import('../pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const HomePage               = lazy(() => import('../pages/HomePage').then(m => ({ default: m.HomePage })));
const JobMatchPage           = lazy(() => import('../pages/JobMatchPage').then(m => ({ default: m.JobMatchPage })));
const JobsPage               = lazy(() => import('../pages/JobsPage').then(m => ({ default: m.JobsPage })));
const LanguageDetailPage     = lazy(() => import('../pages/LanguageDetailPage').then(m => ({ default: m.LanguageDetailPage })));
const LearningHubPage        = lazy(() => import('../pages/LearningHubPage').then(m => ({ default: m.LearningHubPage })));
const LoginPage              = lazy(() => import('../pages/LoginPage').then(m => ({ default: m.LoginPage })));
const MessagesPage           = lazy(() => import('../pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const NetworkPage            = lazy(() => import('../pages/NetworkPage').then(m => ({ default: m.NetworkPage })));
const NotFoundPage           = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const NotificationsPage      = lazy(() => import('../pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProfilePage            = lazy(() => import('../pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ProgrammingLanguagesPage = lazy(() => import('../pages/ProgrammingLanguagesPage').then(m => ({ default: m.ProgrammingLanguagesPage })));
const ProgressPage           = lazy(() => import('../pages/ProgressPage').then(m => ({ default: m.ProgressPage })));
const RecruiterPage          = lazy(() => import('../pages/RecruiterPage').then(m => ({ default: m.RecruiterPage })));
const RegisterPage           = lazy(() => import('../pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ResetPasswordPage      = lazy(() => import('../pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const ResumeAnalyzerPage     = lazy(() => import('../pages/ResumeAnalyzerPage').then(m => ({ default: m.ResumeAnalyzerPage })));
const SettingsPage           = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SkillGapPage           = lazy(() => import('../pages/SkillGapPage').then(m => ({ default: m.SkillGapPage })));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary, #0f172a)' }}>
    <div style={{ width: 40, height: 40, border: '3px solid #334155', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public Authentication Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected SaaS Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<HomePage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/resume" element={<ResumeAnalyzerPage />} />
          <Route path="/resume-ai" element={<ResumeAnalyzerPage />} />
          <Route path="/learning" element={<LearningHubPage />} />
          <Route path="/learning/languages" element={<ProgrammingLanguagesPage />} />
          <Route path="/learning/languages/:language" element={<LanguageDetailPage />} />
          <Route path="/learning/code" element={<CodingPracticePage />} />
          <Route path="/practice" element={<CodingPracticePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/community" element={<FeedPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/connections" element={<NetworkPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Job Match & Skill Gap Routes */}
          <Route path="/job-match" element={<JobMatchPage />} />
          <Route path="/matcher" element={<JobMatchPage />} />
          <Route path="/skills" element={<SkillGapPage />} />

          {/* Role-Protected Enterprise Portals */}
          <Route
            path="/recruiter"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'admin']} redirectTo="/dashboard">
                <RecruiterPage />
              </ProtectedRoute>
            }
          />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']} redirectTo="/dashboard">
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
};

export default AppRoutes;
