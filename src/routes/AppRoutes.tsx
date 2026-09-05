import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Auth Pages
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';

// Authenticated Core Pages
import { HomePage } from '../pages/HomePage';
import { ApplicationsPage } from '../pages/ApplicationsPage';
import { JobsPage } from '../pages/JobsPage';
import { ResumeAnalyzerPage } from '../pages/ResumeAnalyzerPage';
import { LearningHubPage } from '../pages/LearningHubPage';
import { ProgressPage } from '../pages/ProgressPage';
import { FeedPage } from '../pages/FeedPage';
import { NetworkPage } from '../pages/NetworkPage';
import { MessagesPage } from '../pages/MessagesPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { CompaniesPage } from '../pages/CompaniesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { SkillMatcherPage } from '../pages/SkillMatcherPage';
import { JobMatchPage } from '../pages/JobMatchPage';
import { SkillGapPage } from '../pages/SkillGapPage';
import { ProgrammingLanguagesPage } from '../pages/ProgrammingLanguagesPage';
import { LanguageDetailPage } from '../pages/LanguageDetailPage';
import { CodingPracticePage } from '../pages/CodingPracticePage';
import { RecruiterPage } from '../pages/RecruiterPage';
import { CalendarPage } from '../pages/CalendarPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
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
          <Route path="/settings" element={<SettingsPage />} />

          {/* Job Match & Skill Gap Routes */}
          <Route path="/job-match" element={<JobMatchPage />} />
          <Route path="/matcher" element={<JobMatchPage />} />
          <Route path="/skills" element={<SkillGapPage />} />

          {/* Complementary Protected Routes */}
          <Route path="/recruiter" element={<RecruiterPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
      </Route>

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
