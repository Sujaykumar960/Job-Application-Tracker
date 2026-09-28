import React from 'react';
import { cn } from '../../utils/cn';

export interface CompanyLogoProps {
  name: string;
  initials?: string;
  gradient?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 rounded-md text-[10px]',
  sm: 'w-7 h-7 rounded-lg text-xs',
  md: 'w-9 h-9 rounded-xl text-xs',
  lg: 'w-12 h-12 rounded-2xl text-sm',
  xl: 'w-16 h-16 rounded-2xl text-xl',
};

const ICON_SIZE_MAP = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  name,
  initials,
  gradient,
  size = 'lg',
  className,
}) => {
  const normName = (name || '').trim().toLowerCase();
  const displayInitials =
    initials ||
    normName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'CX';

  const containerClasses = cn(
    'flex items-center justify-center font-extrabold flex-shrink-0 select-none shadow-sm transition-transform duration-150',
    SIZE_MAP[size],
    className
  );

  const iconClass = ICON_SIZE_MAP[size];

  // 1. Google (Iconic 4-color G)
  if (normName.includes('google') || normName.includes('alphabet')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-white dark:bg-[#1E293B] border border-[#D9D9D9] dark:border-[#334155]'
        )}
        title={name}
      >
        <svg viewBox="0 0 24 24" className={iconClass}>
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      </div>
    );
  }

  // 2. Vercel (Iconic Black background with pure white triangle)
  if (normName.includes('vercel')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-black text-white border border-slate-700/60 dark:border-slate-800'
        )}
        title={name}
      >
        <svg viewBox="0 0 24 24" className={cn(iconClass, 'fill-current')}>
          <path d="M12 2L2 21h20L12 2z" />
        </svg>
      </div>
    );
  }

  // 3. Linear (Linear Brand Navy/Purple with sleek monogram or icon)
  if (normName.includes('linear')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#12151E] text-white border border-[#2B3145] dark:border-[#383E58]'
        )}
        title={name}
      >
        <svg viewBox="0 0 24 24" className={cn(iconClass, 'fill-none stroke-[#5E6AD2] stroke-[2.2]')}>
          <circle cx="12" cy="12" r="9" />
          <path d="M6 15l6-6 6 6" />
        </svg>
      </div>
    );
  }

  // 4. Netflix (Iconic Netflix Dark with Red N)
  if (normName.includes('netflix')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#141414] text-[#E50914] border border-red-950/40 dark:border-red-900/40 font-black tracking-tight'
        )}
        title={name}
      >
        <span>NF</span>
      </div>
    );
  }

  // 5. Figma (Figma Brand Multi-Color Logo)
  if (normName.includes('figma')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#1E1E1E] border border-slate-700/60 dark:border-slate-800'
        )}
        title={name}
      >
        <svg viewBox="0 0 38 57" className={cn(iconClass, 'h-auto max-h-[75%]')}>
          <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
          <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
          <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
          <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
          <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
        </svg>
      </div>
    );
  }

  // 6. Stripe (Blurple Brand Gradient)
  if (normName.includes('stripe')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#635BFF] to-[#4F46E5] text-white border border-indigo-400/30'
        )}
        title={name}
      >
        <span>ST</span>
      </div>
    );
  }

  // 7. Datadog (Iconic Purple Brand)
  if (normName.includes('datadog')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#632CA6] to-[#7C3AED] text-white border border-purple-400/30'
        )}
        title={name}
      >
        <span>DD</span>
      </div>
    );
  }

  // 8. Airbnb (Rausch Brand Coral)
  if (normName.includes('airbnb')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#FF5A5F] to-[#E00B41] text-white border border-rose-300/30'
        )}
        title={name}
      >
        <span>AB</span>
      </div>
    );
  }

  // 9. Shopify (Shopify Green)
  if (normName.includes('shopify')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#008060] to-[#004C3F] text-white border border-emerald-400/30'
        )}
        title={name}
      >
        <span>SH</span>
      </div>
    );
  }

  // 10. CloudScale (CloudScale Blue/Cyan)
  if (normName.includes('cloudscale')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#0284C7] to-[#1E40AF] text-white border border-cyan-400/30'
        )}
        title={name}
      >
        <span>CS</span>
      </div>
    );
  }

  // 11. OpenAI
  if (normName.includes('openai')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#10A37F] to-[#0A5C47] text-white border border-emerald-400/30'
        )}
        title={name}
      >
        <span>AI</span>
      </div>
    );
  }

  // 12. Anthropic
  if (normName.includes('anthropic')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#D97706] to-[#92400E] text-white border border-amber-400/30 font-serif'
        )}
        title={name}
      >
        <span>A</span>
      </div>
    );
  }

  // 13. Meta
  if (normName.includes('meta')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#0668E1] to-[#0082FB] text-white border border-blue-400/30'
        )}
        title={name}
      >
        <span>M</span>
      </div>
    );
  }

  // 14. Apple
  if (normName.includes('apple')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-black text-white border border-slate-700/60 dark:border-slate-800'
        )}
        title={name}
      >
        <span className="text-base"></span>
      </div>
    );
  }

  // 15. Microsoft
  if (normName.includes('microsoft')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#1F1F1F] border border-slate-700/60 dark:border-slate-800 p-1.5'
        )}
        title={name}
      >
        <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
          <div className="bg-[#F25022]" />
          <div className="bg-[#7FBA00]" />
          <div className="bg-[#00A4EF]" />
          <div className="bg-[#FFB900]" />
        </div>
      </div>
    );
  }

  // 16. Amazon / AWS
  if (normName.includes('amazon') || normName.includes('aws')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#232F3E] text-[#FF9900] border border-amber-500/30 font-black'
        )}
        title={name}
      >
        <span>AMZ</span>
      </div>
    );
  }

  // 17. GitHub
  if (normName.includes('github')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#24292F] text-white border border-slate-700 dark:border-slate-800'
        )}
        title={name}
      >
        <span>GH</span>
      </div>
    );
  }

  // 18. Discord
  if (normName.includes('discord')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#5865F2] text-white border border-indigo-400/30'
        )}
        title={name}
      >
        <span>DC</span>
      </div>
    );
  }

  // 19. Notion
  if (normName.includes('notion')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-black text-white border border-slate-700 dark:border-slate-800 font-serif font-black'
        )}
        title={name}
      >
        <span>N</span>
      </div>
    );
  }

  // 20. Spotify
  if (normName.includes('spotify')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#1DB954] to-[#138038] text-black border border-emerald-400/30 font-black'
        )}
        title={name}
      >
        <span>SP</span>
      </div>
    );
  }

  // 21. Cloudflare
  if (normName.includes('cloudflare')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#F38020] to-[#E55A00] text-white border border-orange-400/30'
        )}
        title={name}
      >
        <span>CF</span>
      </div>
    );
  }

  // 22. Supabase
  if (normName.includes('supabase')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#1C1C1C] text-[#3ECF8E] border border-emerald-500/30 font-black'
        )}
        title={name}
      >
        <span>SB</span>
      </div>
    );
  }

  // 23. Coinbase
  if (normName.includes('coinbase')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-[#0052FF] text-white border border-blue-400/30 font-black'
        )}
        title={name}
      >
        <span>CB</span>
      </div>
    );
  }

  // 24. Snowflake
  if (normName.includes('snowflake')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#29B5E8] to-[#126899] text-white border border-cyan-400/30'
        )}
        title={name}
      >
        <span>❄</span>
      </div>
    );
  }

  // 25. Databricks
  if (normName.includes('databricks')) {
    return (
      <div
        className={cn(
          containerClasses,
          'bg-gradient-to-br from-[#FF3621] to-[#A31607] text-white border border-red-400/30'
        )}
        title={name}
      >
        <span>DB</span>
      </div>
    );
  }

  // Generic / Custom / Fallback Company Logos
  // Deterministic palette guaranteeing high contrast, non-transparent background in both light & dark mode
  const FALLBACK_PALETTES = [
    'bg-gradient-to-br from-blue-600 to-indigo-800 text-white border-blue-400/30',
    'bg-gradient-to-br from-violet-600 to-purple-800 text-white border-violet-400/30',
    'bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-emerald-400/30',
    'bg-gradient-to-br from-rose-600 to-pink-800 text-white border-rose-400/30',
    'bg-gradient-to-br from-amber-600 to-orange-800 text-white border-amber-400/30',
    'bg-gradient-to-br from-cyan-600 to-blue-700 text-white border-cyan-400/30',
    'bg-gradient-to-br from-indigo-700 to-slate-900 text-white border-indigo-500/30',
    'bg-gradient-to-br from-teal-600 to-emerald-800 text-white border-teal-400/30',
  ];

  let hash = 0;
  for (let i = 0; i < normName.length; i++) {
    hash = (hash << 5) - hash + normName.charCodeAt(i);
    hash |= 0;
  }
  const paletteIndex = Math.abs(hash) % FALLBACK_PALETTES.length;
  const chosenPalette = FALLBACK_PALETTES[paletteIndex];

  return (
    <div
      className={cn(containerClasses, chosenPalette, 'border')}
      title={name}
    >
      <span>{displayInitials}</span>
    </div>
  );
};

export default CompanyLogo;
