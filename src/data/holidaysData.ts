export interface Holiday {
  date: string; // 'YYYY-MM-DD' or 'MM-DD' for annual recurring
  name: string;
  type: 'Public' | 'National' | 'Tech & Observance' | 'Cultural' | 'Festival';
  icon: string;
  description: string;
}

export const HOLIDAYS_DATA: Holiday[] = [
  // --- JANUARY ---
  {
    date: '01-01',
    name: "New Year's Day",
    type: 'Public',
    icon: '🥂',
    description: 'First day of the Gregorian year, celebrated globally.',
  },
  {
    date: '2026-01-19',
    name: 'Martin Luther King Jr. Day',
    type: 'National',
    icon: '🕊️',
    description: 'Federal holiday honoring civil rights leader MLK Jr.',
  },
  {
    date: '01-26',
    name: 'Republic Day (India)',
    type: 'National',
    icon: '🇮🇳',
    description: 'Honoring the date on which the Constitution of India came into effect.',
  },

  // --- FEBRUARY ---
  {
    date: '02-14',
    name: "Valentine's Day",
    type: 'Cultural',
    icon: '💖',
    description: 'Celebration of affection, love, and partnership.',
  },
  {
    date: '2026-02-16',
    name: "Presidents' Day",
    type: 'National',
    icon: '🏛️',
    description: 'US federal holiday commemorating Washington & Lincoln.',
  },
  {
    date: '02-28',
    name: 'National Science Day',
    type: 'Tech & Observance',
    icon: '🔬',
    description: 'Celebrating the discovery of the Raman effect in physics.',
  },

  // --- MARCH ---
  {
    date: '03-08',
    name: "International Women's Day",
    type: 'Tech & Observance',
    icon: '👩‍💻',
    description: 'Global day celebrating social, economic, and tech achievements of women.',
  },
  {
    date: '03-14',
    name: 'Pi Day (3.14)',
    type: 'Tech & Observance',
    icon: '🥧',
    description: 'Annual celebration of the mathematical constant π (pi).',
  },
  {
    date: '03-17',
    name: "St. Patrick's Day",
    type: 'Cultural',
    icon: '🍀',
    description: 'Cultural and religious celebration held on the death date of Saint Patrick.',
  },
  {
    date: '2026-03-27',
    name: 'Holi - Festival of Colors',
    type: 'Festival',
    icon: '🎨',
    description: 'Vibrant spring festival symbolizing the victory of good over evil.',
  },
  {
    date: '03-31',
    name: 'World Backup Day',
    type: 'Tech & Observance',
    icon: '💾',
    description: 'Global initiative reminding engineers and developers to back up code and critical data.',
  },

  // --- APRIL ---
  {
    date: '2026-04-05',
    name: 'Easter Sunday',
    type: 'Cultural',
    icon: '🐣',
    description: 'Spring festival celebrated globally.',
  },
  {
    date: '04-22',
    name: 'Earth Day',
    type: 'Tech & Observance',
    icon: '🌍',
    description: 'International event demonstrating support for environmental protection.',
  },

  // --- MAY ---
  {
    date: '05-01',
    name: "International Workers' Day / May Day",
    type: 'Public',
    icon: '🛠️',
    description: 'Celebration of laborers and the working classes worldwide.',
  },
  {
    date: '05-04',
    name: 'Star Wars Day (May the 4th)',
    type: 'Cultural',
    icon: '🌌',
    description: 'Commemorative day celebrating the Star Wars franchise ("May the 4th be with you").',
  },
  {
    date: '2026-05-25',
    name: 'Memorial Day',
    type: 'National',
    icon: '🎖️',
    description: 'US federal holiday honoring military personnel who died in service.',
  },

  // --- JUNE ---
  {
    date: '06-05',
    name: 'World Environment Day',
    type: 'Tech & Observance',
    icon: '🌿',
    description: 'United Nations day encouraging worldwide awareness and action for the environment.',
  },
  {
    date: '06-19',
    name: 'Juneteenth National Independence Day',
    type: 'National',
    icon: '🕊️',
    description: 'Commemorating the emancipation of enslaved African Americans.',
  },
  {
    date: '06-21',
    name: 'International Yoga Day & Solstice',
    type: 'Cultural',
    icon: '🧘',
    description: 'Recognizing global health, wellness, and summer solstice.',
  },

  // --- JULY ---
  {
    date: '07-04',
    name: 'Independence Day (US)',
    type: 'National',
    icon: '🎆',
    description: 'Commemorating the Declaration of Independence in 1776.',
  },
  {
    date: '07-16',
    name: 'World Artificial Intelligence Day',
    type: 'Tech & Observance',
    icon: '🤖',
    description: 'Celebrating advancements in machine learning, algorithms, and AI research.',
  },
  {
    date: '2026-07-31',
    name: 'SysAdmin Appreciation Day',
    type: 'Tech & Observance',
    icon: '🖥️',
    description: 'Recognizing system administrators and DevOps engineers keeping tech running.',
  },

  // --- AUGUST ---
  {
    date: '08-15',
    name: 'Independence Day (India)',
    type: 'National',
    icon: '🇮🇳',
    description: 'Celebrating national independence achieved in 1947.',
  },
  {
    date: '2026-08-28',
    name: 'Raksha Bandhan',
    type: 'Festival',
    icon: '🧵',
    description: 'Traditional Hindu festival celebrating the bond between siblings.',
  },

  // --- SEPTEMBER ---
  {
    date: '09-05',
    name: "Teachers' Day",
    type: 'Cultural',
    icon: '📚',
    description: 'Honoring mentors, educators, and leaders who guide careers.',
  },
  {
    date: '2026-09-07',
    name: 'Labor Day (US)',
    type: 'National',
    icon: '🛠️',
    description: 'US federal holiday recognizing the American labor movement and workers.',
  },
  {
    date: '09-13',
    name: 'International Programmers’ Day',
    type: 'Tech & Observance',
    icon: '💻',
    description: 'Celebrated on the 256th day (0x100) of the year honoring coders and software developers!',
  },
  {
    date: '09-15',
    name: "Engineers' Day",
    type: 'Tech & Observance',
    icon: '⚙️',
    description: 'Honoring engineers and innovators in technology and infrastructure.',
  },
  {
    date: '09-16',
    name: 'International Ozone Day',
    type: 'Tech & Observance',
    icon: '🌐',
    description: 'UN observance for preservation of the Earth’s protective ozone layer.',
  },
  {
    date: '09-21',
    name: 'International Day of Peace',
    type: 'Tech & Observance',
    icon: '☮️',
    description: 'Strengthening the ideals of peace around the world.',
  },
  {
    date: '09-22',
    name: 'Autumnal Equinox',
    type: 'Cultural',
    icon: '🍂',
    description: 'First astronomical day of autumn with equal day and night.',
  },
  {
    date: '09-27',
    name: 'World Tourism Day',
    type: 'Cultural',
    icon: '✈️',
    description: 'Fostering global cultural exchange and sustainable travel.',
  },
  {
    date: '09-29',
    name: 'World Heart Day',
    type: 'Tech & Observance',
    icon: '💖',
    description: 'Global campaign informing people about cardiovascular health and healthy living.',
  },

  // --- OCTOBER ---
  {
    date: '10-02',
    name: 'Gandhi Jayanti',
    type: 'National',
    icon: '🕊️',
    description: 'National holiday in India marking Mahatma Gandhi’s birthday (International Day of Non-Violence).',
  },
  {
    date: '2026-10-12',
    name: 'Indigenous Peoples’ / Columbus Day',
    type: 'National',
    icon: '🌎',
    description: 'US holiday honoring Indigenous peoples and heritage.',
  },
  {
    date: '10-24',
    name: 'United Nations Day',
    type: 'Tech & Observance',
    icon: '🇺🇳',
    description: 'Marking the anniversary of the entry into force of the UN Charter in 1945.',
  },
  {
    date: '10-31',
    name: 'Halloween',
    type: 'Cultural',
    icon: '🎃',
    description: 'Festive evening of costumes, trick-or-treating, and celebration.',
  },

  // --- NOVEMBER ---
  {
    date: '11-01',
    name: "All Saints' Day & World Vegan Day",
    type: 'Cultural',
    icon: '🌿',
    description: 'Honoring saints and promoting plant-based sustainability.',
  },
  {
    date: '2026-11-08',
    name: 'Diwali - Festival of Lights',
    type: 'Festival',
    icon: '🪔',
    description: 'Celebration of light over darkness, new beginnings, prosperity, and joy.',
  },
  {
    date: '11-11',
    name: 'Veterans Day / Remembrance Day',
    type: 'National',
    icon: '🎖️',
    description: 'Honoring military veterans who served in the armed forces.',
  },
  {
    date: '2026-11-26',
    name: 'Thanksgiving Day (US)',
    type: 'National',
    icon: '🦃',
    description: 'Federal holiday giving thanks for harvest and blessings of the past year.',
  },
  {
    date: '2026-11-27',
    name: 'Black Friday',
    type: 'Cultural',
    icon: '🏷️',
    description: 'Major shopping event kickstarting the winter holiday season.',
  },
  {
    date: '2026-11-30',
    name: 'Cyber Monday',
    type: 'Tech & Observance',
    icon: '💻',
    description: 'Global tech and online shopping event for software, gadgets, and gear.',
  },

  // --- DECEMBER ---
  {
    date: '12-10',
    name: 'Human Rights Day',
    type: 'Tech & Observance',
    icon: '⚖️',
    description: 'Honoring the adoption of the Universal Declaration of Human Rights.',
  },
  {
    date: '12-24',
    name: 'Christmas Eve',
    type: 'Cultural',
    icon: '🎄',
    description: 'Evening before Christmas Day with gatherings and celebrations.',
  },
  {
    date: '12-25',
    name: 'Christmas Day',
    type: 'Public',
    icon: '🎅',
    description: 'Global holiday celebrating friendship, generosity, and family.',
  },
  {
    date: '12-31',
    name: "New Year's Eve",
    type: 'Cultural',
    icon: '🎆',
    description: 'Last day of the year, countdowns, and resolutions for the future.',
  },
];

/**
 * Returns holiday for a date string in YYYY-MM-DD format.
 */
export function getHolidayForDate(dateStr: string): Holiday | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  const monthDay = `${parts[1]}-${parts[2]}`;

  // 1. First priority: Exact YYYY-MM-DD match
  const exact = HOLIDAYS_DATA.find((h) => h.date === dateStr);
  if (exact) return exact;

  // 2. Second priority: MM-DD recurring match
  const recurring = HOLIDAYS_DATA.find((h) => h.date === monthDay);
  if (recurring) return recurring;

  return null;
}

/**
 * Returns all holidays for a given month (0-indexed month: 0=Jan, 8=Sep).
 */
export function getHolidaysForMonth(year: number, monthIndex: number): Array<Holiday & { fullDate: string; dayNumber: number }> {
  const monthStr = String(monthIndex + 1).padStart(2, '0');
  const results: Array<Holiday & { fullDate: string; dayNumber: number }> = [];

  for (const h of HOLIDAYS_DATA) {
    if (h.date.length === 5 && h.date.startsWith(`${monthStr}-`)) {
      const dayNum = parseInt(h.date.split('-')[1], 10);
      const fullDate = `${year}-${monthStr}-${String(dayNum).padStart(2, '0')}`;
      results.push({ ...h, fullDate, dayNumber: dayNum });
    } else if (h.date.startsWith(`${year}-${monthStr}-`)) {
      const dayNum = parseInt(h.date.split('-')[2], 10);
      results.push({ ...h, fullDate: h.date, dayNumber: dayNum });
    }
  }

  return results.sort((a, b) => a.dayNumber - b.dayNumber);
}
