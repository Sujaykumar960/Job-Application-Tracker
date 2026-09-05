import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#1D2226]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full bg-white text-[#1D2226] text-xs rounded-lg border px-3 py-2 pr-8 appearance-none transition duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#E8F3FF] focus:border-[#0A66C2]',
              error ? 'border-[#E6395A]' : 'border-[#D9D9D9] hover:border-[#788896]',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-[#1D2226]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#56687A] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {error && <p className="text-[11px] text-[#E6395A] font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
