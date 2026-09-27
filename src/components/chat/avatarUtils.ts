/**
 * Helper utility to return consistent, rich, un-purged Tailwind gradient styles for chat avatars.
 */
export const getAvatarGradientClass = (seed?: string): string => {
  const gradientStyles = [
    'bg-gradient-to-br from-[#0A66C2] to-[#004182] text-white',
    'bg-gradient-to-br from-indigo-600 to-blue-700 text-white',
    'bg-gradient-to-br from-teal-600 to-emerald-700 text-white',
    'bg-gradient-to-br from-purple-600 to-violet-700 text-white',
    'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    'bg-gradient-to-br from-rose-500 to-pink-600 text-white',
    'bg-gradient-to-br from-cyan-600 to-blue-600 text-white',
  ];

  if (!seed) return gradientStyles[0];

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradientStyles.length;
  return gradientStyles[index];
};

export const getAvatarInitials = (name?: string, fallbackInitials?: string): string => {
  if (fallbackInitials && fallbackInitials.trim()) {
    return fallbackInitials.trim().toUpperCase();
  }
  if (!name || !name.trim()) return 'CX';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts[0]?.toUpperCase() || 'CX';
};
