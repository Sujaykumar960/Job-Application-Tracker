import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * SkillMatcherPage is an alias that redirects to the real, fully-integrated JobMatchPage.
 */
export const SkillMatcherPage: React.FC = () => {
  return <Navigate to="/job-match" replace />;
};

export default SkillMatcherPage;
