import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#1D2226] dark:text-[#E2E8F0]">
            {label}
          </label>
        )}
        <div className="relative rounded-lg">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788896] dark:text-[#94A3B8]">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-white dark:bg-[#1E293B] text-[#1D2226] dark:text-[#F8FAFC] placeholder-[#788896] dark:placeholder-[#64748B] text-xs sm:text-sm rounded-lg border py-2 transition duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#E8F3FF] dark:focus:ring-[#38BDF8]/20 focus:border-[#0A66C2] dark:focus:border-[#38BDF8]',
              icon ? 'pl-9 pr-3' : 'px-3',
              error
                ? 'border-[#E6395A] dark:border-rose-500'
                : 'border-[#D9D9D9] dark:border-[#475569] hover:border-[#788896] dark:hover:border-[#94A3B8]',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-[#E6395A] dark:text-rose-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
