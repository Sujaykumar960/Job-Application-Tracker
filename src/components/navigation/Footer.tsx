import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#D9D9D9] bg-white py-4 mt-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#56687A]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#1D2226]">CareerX</span>
          <span>— Production AI Career Platform</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#56687A]">
          <Link to="/learning" className="hover:text-[#0A66C2] transition">Dev Hub</Link>
          <Link to="/resume" className="hover:text-[#0A66C2] transition">ATS Optimizer</Link>
          <Link to="/matcher" className="hover:text-[#0A66C2] transition">Skill Gap</Link>
          <Link to="/recruiter" className="hover:text-[#0A66C2] transition">Recruiter Portal</Link>
        </div>
      </div>
    </footer>
  );
};
