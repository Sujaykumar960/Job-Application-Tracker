import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ResumeItem {
  id: string;
  name: string;
  format: 'PDF' | 'DOCX';
  size: string;
  uploadDate: string;
  atsScore: number;
  isActive: boolean;
}

export interface ResumeUploadZoneProps {
  resumes: ResumeItem[];
  activeResumeId: string;
  onSelectResume: (id: string) => void;
  onUploadNew: (file: File) => void;
  onDeleteResume: (id: string) => void;
  isAnalyzing: boolean;
  onTriggerAnalysis: () => void;
}

export const ResumeUploadZone: React.FC<ResumeUploadZoneProps> = ({
  resumes,
  activeResumeId,
  onSelectResume,
  onUploadNew,
  onDeleteResume,
  isAnalyzing,
  onTriggerAnalysis,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    const validExtensions = ['.pdf', '.docx'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(extension)) {
      setUploadError('Only PDF (.pdf) and Word (.docx) files are supported.');
      setTimeout(() => setUploadError(null), 4000);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      setTimeout(() => setUploadError(null), 4000);
      return;
    }
    setUploadError(null);
    onUploadNew(file);
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'p-5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-2 group',
          isDragging
            ? 'border-[#0A66C2] dark:border-blue-500 bg-[#E8F3FF] dark:bg-blue-950/40 scale-[0.99]'
            : 'border-[#D9D9D9] dark:border-slate-700 hover:border-[#0A66C2]/60 dark:hover:border-blue-500/60 bg-[#F3F6F8] dark:bg-slate-800/40 hover:bg-[#E8E8E8]/50 dark:hover:bg-slate-800/70'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-[#D9D9D9] dark:border-slate-700 flex items-center justify-center text-[#0A66C2] dark:text-blue-400 group-hover:scale-110 shadow-xs transition">
          <UploadCloud className="w-5 h-5" />
        </div>

        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#1D2226] dark:text-slate-100">
            Click to upload or drag and drop
          </p>
          <p className="text-[11px] text-[#56687A] dark:text-slate-400">
            PDF or DOCX (Max file size 5MB)
          </p>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-[#56687A] dark:text-slate-300 border border-[#D9D9D9] dark:border-slate-700">
            .PDF
          </span>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-[#56687A] dark:text-slate-300 border border-[#D9D9D9] dark:border-slate-700">
            .DOCX
          </span>
        </div>
      </div>

      {/* Resume Version Switcher & List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
            Resume Library ({resumes.length})
          </span>
          <span className="text-[10px] text-[#788896] dark:text-slate-400">Select version to analyze</span>
        </div>

        <div className="space-y-2">
          {resumes.map((resume) => {
            const isSelected = resume.id === activeResumeId;

            return (
              <div
                key={resume.id}
                onClick={() => onSelectResume(resume.id)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer group',
                  isSelected
                    ? 'bg-[#E8F3FF] dark:bg-blue-950/40 border-[#0A66C2] dark:border-blue-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-[#D9D9D9] dark:border-slate-800 hover:border-[#0A66C2]/40 dark:hover:border-blue-500/40'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 border',
                      resume.format === 'PDF'
                        ? 'bg-[#FCE8E6] dark:bg-rose-950/40 text-[#B3261E] dark:text-rose-400 border-[#f8cbc7] dark:border-rose-800/40'
                        : 'bg-[#E8F3FF] dark:bg-blue-950/40 text-[#0A66C2] dark:text-blue-400 border-[#d0e6fc] dark:border-blue-800/40'
                    )}
                  >
                    {resume.format}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1D2226] dark:text-slate-100 truncate group-hover:text-[#0A66C2] dark:group-hover:text-blue-400 transition">
                      {resume.name}
                    </p>
                    <p className="text-[10px] text-[#788896] dark:text-slate-400 font-mono mt-0.5">
                      {resume.size} • {resume.uploadDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                      resume.atsScore >= 90
                        ? 'bg-[#E6F4EA] dark:bg-emerald-950/40 text-[#137333] dark:text-emerald-400 border-[#c6ecd2] dark:border-emerald-800/40'
                        : 'bg-[#E8F3FF] dark:bg-blue-950/40 text-[#0A66C2] dark:text-blue-400 border-[#d0e6fc] dark:border-blue-800/40'
                    )}
                  >
                    {resume.atsScore}%
                  </span>

                  {resumes.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteResume(resume.id);
                      }}
                      className="p-1 text-[#788896] dark:text-slate-400 hover:text-[#B3261E] dark:hover:text-rose-400 transition"
                      title="Delete version"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main AI Analysis Trigger Button */}
      <Button
        variant="primary"
        size="md"
        className="w-full bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 shadow-md shadow-brand-500/20"
        loading={isAnalyzing}
        onClick={onTriggerAnalysis}
        icon={<Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />}
      >
        {isAnalyzing ? 'Running AI ATS Parser...' : 'Re-Analyze with AI Engine'}
      </Button>
    </div>
  );
};

export default ResumeUploadZone;
