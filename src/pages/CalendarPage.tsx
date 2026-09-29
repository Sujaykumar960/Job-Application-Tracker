import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { calendarSyncApi, CalendarEvent, CalendarEventType, GoogleCalendarSyncResult } from '../api/calendarSync';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Plus,
  Download,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Building2,
  AlertCircle,
  FileText,
  Briefcase,
  Loader2,
  Trash2,
  PartyPopper,
  CalendarDays,
  CalendarCheck2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  Holiday,
  getHolidayForDate,
  getHolidaysForMonth,
} from '../data/holidaysData';

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEventType, setSelectedEventType] = useState<string>('All');

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await calendarSyncApi.getEvents();
        setEvents(data);
      } catch (err) {
        setError('Failed to load calendar events. Please try again.');
        console.error('Calendar fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [syncStatus, setSyncStatus] = useState<GoogleCalendarSyncResult | null>(null);

  // Dynamic today date calculation (strictly dynamic, no hardcoded date)
  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Current calendar month state (initializes to today's year and month)
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Google Calendar Sync Simulation
  const handleSyncGoogleCalendar = async () => {
    setIsSyncingGoogle(true);
    try {
      const res = await calendarSyncApi.syncWithGoogle();
      setSyncStatus(res);
      // Mark all as synced
      const updated = events.map((e) => ({ ...e, isSyncedWithGoogle: true }));
      setEvents(updated);
      setSyncNotice(`✅ Synced ${res.syncedCount} events with Google Calendar (${res.accountEmail})`);
      setTimeout(() => setSyncNotice(null), 4000);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Export .ICS
  const handleExportIcs = () => {
    calendarSyncApi.downloadIcs(events);
  };

  // Handle Add Event
  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) return;

    const eventData: Partial<CalendarEvent> = {
      title: newEvent.title,
      type: newEvent.type,
      date: newEvent.date,
      time: newEvent.time,
      company: newEvent.company.trim() || undefined,
      locationOrUrl: newEvent.locationOrUrl.trim() || undefined,
      notes: newEvent.notes.trim() || undefined,
      isSyncedWithGoogle: true,
    };

    const created = await calendarSyncApi.createEvent(eventData);
    setEvents((prev) => [...prev, created]);
    setIsAddModalOpen(false);
    setNewEvent({
      title: '',
      type: 'Interview',
      date: selectedDate || todayDateStr,
      time: '10:00 AM',
      company: '',
      locationOrUrl: '',
      notes: '',
    });
  };

  // Handle Delete Event
  const handleDeleteEvent = async (id: string) => {
    try {
      await calendarSyncApi.deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  // Navigation: Previous & Next Month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Reset view to dynamic Today
  const handleResetToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDate(todayDateStr);
  };

  // Day Navigation for Day-Wise Inspector
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    setSelectedDate(prevStr);
    if (prev.getMonth() !== currentMonth || prev.getFullYear() !== currentYear) {
      setCurrentMonth(prev.getMonth());
      setCurrentYear(prev.getFullYear());
    }
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
    if (next.getMonth() !== currentMonth || next.getFullYear() !== currentYear) {
      setCurrentMonth(next.getMonth());
      setCurrentYear(next.getFullYear());
    }
  };

  const openAddModalForDate = (dateStr?: string) => {
    setNewEvent((prev) => ({
      ...prev,
      date: dateStr || selectedDate || todayDateStr,
    }));
    setIsAddModalOpen(true);
  };

  // Form State for Add Event
  const [newEvent, setNewEvent] = useState<{
    title: string;
    type: CalendarEventType;
    date: string;
    time: string;
    company: string;
    locationOrUrl: string;
    notes: string;
  }>({
    title: '',
    type: 'Interview',
    date: todayDateStr,
    time: '10:00 AM',
    company: '',
    locationOrUrl: '',
    notes: '',
  });

  // Month holidays for active month
  const monthHolidays = useMemo(
    () => getHolidaysForMonth(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Selected date holiday
  const selectedDateHoliday = useMemo(
    () => getHolidayForDate(selectedDate),
    [selectedDate]
  );

  // Events for selected date
  const selectedDateEvents = useMemo(
    () => events.filter((e) => e.date === selectedDate),
    [events, selectedDate]
  );

  // Formatted date string for selected date
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  // Color config for the 4 requested event types with full dark mode support
  const eventTypeConfig: Record<
    CalendarEventType,
    { label: string; bg: string; text: string; border: string; badge: 'brand' | 'danger' | 'warning' | 'success' }
  > = {
    Interview: {
      label: 'Interview',
      bg: 'bg-blue-50 dark:bg-blue-950/80',
      text: 'text-[#0A66C2] dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'brand',
    },
    Deadline: {
      label: 'Deadline',
      bg: 'bg-rose-50 dark:bg-rose-950/80',
      text: 'text-[#B3261E] dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      badge: 'danger',
    },
    'Follow-up': {
      label: 'Follow-up',
      bg: 'bg-amber-50 dark:bg-amber-950/80',
      text: 'text-[#8A6100] dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'warning',
    },
    Assessment: {
      label: 'Assessment',
      bg: 'bg-emerald-50 dark:bg-emerald-950/80',
      text: 'text-[#137333] dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'success',
    },
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    if (selectedEventType === 'All') return events;
    return events.filter((e) => e.type === selectedEventType);
  }, [events, selectedEventType]);

  // Generate calendar grid for current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      events: CalendarEvent[];
    }> = [];

    // Previous month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        events: filteredEvents.filter((e) => e.date === dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        events: filteredEvents.filter((e) => e.date === dateStr),
      });
    }

    // Next month padding to fill grid to multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: j,
        isCurrentMonth: false,
        events: filteredEvents.filter((e) => e.date === dateStr),
      });
    }

    return days;
  }, [currentYear, currentMonth, filteredEvents]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0A66C2]" />
        <span className="ml-3 text-[#56687A]">Loading calendar...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[#E6395A]" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#1D2226]">Unable to load calendar</h3>
          <p className="text-[#56687A] mt-1">{error}</p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <PageHeader
        title="Career Schedule & Technical Calendar"
        description="Track interviews, take-home assessment cutoffs, offer decision deadlines, and recruiter follow-ups."
        badge={
          <Badge variant="brand" size="sm" className="font-mono text-[10px]">
            {filteredEvents.length} Scheduled Milestones
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Google Calendar Sync Action */}
            <Button
              size="sm"
              variant="outline"
              loading={isSyncingGoogle}
              onClick={handleSyncGoogleCalendar}
              icon={<RefreshCw className="w-3.5 h-3.5 text-brand-400" />}
            >
              Sync Google Calendar
            </Button>

            {/* Export .ICS Action */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportIcs}
              icon={<Download className="w-3.5 h-3.5 text-slate-400" />}
            >
              Export .ICS
            </Button>

            {/* Add Event Action */}
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Event
            </Button>
          </div>
        }
      />

      {/* Google Calendar Sync Notice */}
      {syncNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GOOGLE CALENDAR SYNC BANNER                                            */}
      {/* ========================================================================= */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-[#1D2226] dark:text-slate-100">
              <span>Google Calendar API Integration Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-[#56687A] dark:text-slate-400">
              {syncStatus ? (
                <>Synced with <strong className="text-[#1D2226] dark:text-slate-200">{syncStatus.accountEmail}</strong> • Last updated {syncStatus.lastSyncedAt}</>
              ) : (
                'Sync not yet performed'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-[#56687A] dark:text-slate-400 self-end sm:self-center">
          <span className="px-2 py-0.5 rounded bg-[#F3F6F8] dark:bg-slate-800 border border-[#D9D9D9] dark:border-slate-700">
            {events.filter((e) => e.isSyncedWithGoogle).length} Events Synced
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CALENDAR TOOLBAR: MONTH CONTROLS & EVENT FILTERS                       */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[#1D2226] dark:text-slate-100 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0A66C2] dark:text-blue-400" />
            <span>
              {monthNames[currentMonth]} {currentYear}
            </span>
          </h2>

          <div className="flex items-center bg-[#F3F6F8] dark:bg-slate-800 rounded-lg p-0.5 border border-[#D9D9D9] dark:border-slate-700">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetToday}
              className="px-2 py-0.5 text-[11px] font-semibold text-[#1D2226] dark:text-slate-200 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 rounded transition"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills (4 Requested Event Types) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Interview', 'Deadline', 'Follow-up', 'Assessment'] as const).map((type) => {
            const count =
              type === 'All' ? events.length : events.filter((e) => e.type === type).length;

            return (
              <button
                key={type}
                onClick={() => setSelectedEventType(type)}
                className={cn(
                  'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5',
                  selectedEventType === type
                    ? 'bg-[#0A66C2] dark:bg-blue-600 text-white shadow-sm'
                    : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-200 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
                )}
              >
                <span>{type === 'All' ? 'All Milestones' : `${type}s`}</span>
                <span className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                  selectedEventType === type ? 'bg-[#004182] dark:bg-blue-700 text-white' : 'bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2.5 THIS MONTH'S HOLIDAYS TICKER                                          */}
      {/* ========================================================================= */}
      {monthHolidays.length > 0 && (
        <div className="p-2.5 px-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold whitespace-nowrap text-[11px] font-mono flex-shrink-0">
            <PartyPopper className="w-3.5 h-3.5 text-amber-500" />
            <span>{monthNames[currentMonth]} Holidays & Observances ({monthHolidays.length}):</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {monthHolidays.map((h, i) => {
              const isCurrentSelected = selectedDate === h.fullDate;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDate(h.fullDate)}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-[10px] font-mono whitespace-nowrap flex items-center gap-1.5 border transition cursor-pointer flex-shrink-0',
                    isCurrentSelected
                      ? 'bg-[#0A66C2] dark:bg-blue-600 text-white border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-200 border-[#D9D9D9] dark:border-slate-700 hover:border-[#0A66C2] dark:hover:border-blue-400'
                  )}
                  title={`${h.name} (${h.type}) - ${h.description}`}
                >
                  <span>{h.icon}</span>
                  <span className="font-semibold">{h.dayNumber} {monthNames[currentMonth].slice(0, 3)}:</span>
                  <span>{h.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN MONTHLY CALENDAR GRID (Clear Box Pattern Dividing Each Day)       */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 overflow-x-auto shadow-sm">
        <div className="min-w-[680px]">
          {/* Days of Week Header with Clear Column Dividers */}
          <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800/95 border-b-2 border-slate-300 dark:border-slate-700 text-center text-[11px] font-mono font-bold uppercase text-slate-600 dark:text-slate-300 py-3 divide-x divide-slate-300 dark:divide-slate-700">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Day Cells - High-Contrast 1px Dividing Lines Around Every Box */}
          <div className="grid grid-cols-7 gap-[1px] bg-slate-300 dark:bg-slate-700">
          {calendarDays.map((day, idx) => {
            const isSelected = day.dateStr === selectedDate;
            const isToday = day.dateStr === todayDateStr;
            const dayHoliday = getHolidayForDate(day.dateStr);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day.dateStr)}
                className={cn(
                  'min-h-[115px] p-2 flex flex-col justify-between transition-all cursor-pointer select-none group relative',
                  day.isCurrentMonth
                    ? isSelected
                      ? 'bg-blue-50/95 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      : isToday
                      ? 'bg-sky-50/80 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-900 dark:text-slate-100'
                    : isSelected
                      ? 'bg-blue-50/40 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
                      : 'bg-slate-100/80 dark:bg-[#070D18] text-slate-400 dark:text-slate-600',
                  isSelected
                    ? 'ring-2 ring-inset ring-[#0A66C2] dark:ring-blue-500 z-10'
                    : 'hover:ring-1 hover:ring-inset hover:ring-[#0A66C2]/40 dark:hover:ring-blue-400/40 hover:z-10'
                )}
              >
                {/* Day Box Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'text-xs font-mono font-bold flex items-center justify-center transition',
                        isToday
                          ? 'w-6 h-6 rounded-full bg-[#0A66C2] dark:bg-blue-600 text-white shadow-xs'
                          : isSelected
                          ? 'w-6 h-6 rounded-full border-2 border-[#0A66C2] dark:border-blue-400 text-[#0A66C2] dark:text-blue-400 bg-white dark:bg-slate-900 shadow-xs'
                          : day.isCurrentMonth
                          ? 'text-[#1D2226] dark:text-slate-100'
                          : 'text-[#9AA5B1] dark:text-slate-500'
                      )}
                    >
                      {day.dayNumber}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-mono font-bold text-[#0A66C2] dark:text-blue-400 uppercase tracking-wider hidden sm:inline">
                        Today
                      </span>
                    )}
                  </div>

                  {dayHoliday && (
                    <span
                      title={`Holiday: ${dayHoliday.name} (${dayHoliday.type})`}
                      className="text-xs transition-transform group-hover:scale-125"
                    >
                      {dayHoliday.icon}
                    </span>
                  )}
                </div>

                {/* Day Events & Holiday Chips */}
                <div className="space-y-1 mt-1 flex-1">
                  {dayHoliday && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(day.dateStr);
                      }}
                      className="p-1 px-1.5 rounded-md bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 text-[9px] font-mono text-amber-800 dark:text-amber-300 flex items-center gap-1 truncate shadow-2xs hover:bg-amber-500/25 transition cursor-pointer"
                      title={`Holiday: ${dayHoliday.name} (${dayHoliday.type}) - Click to view`}
                    >
                      <span className="flex-shrink-0 text-[10px]">{dayHoliday.icon}</span>
                      <span className="truncate font-semibold">{dayHoliday.name}</span>
                    </div>
                  )}

                  {day.events.slice(0, 2).map((evt) => {
                    const conf = eventTypeConfig[evt.type];

                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        className={cn(
                          'p-1 px-1.5 rounded-md border text-[10px] font-mono cursor-pointer transition truncate flex items-center gap-1 shadow-xs',
                          conf.bg,
                          conf.text,
                          conf.border
                        )}
                        title={`${evt.title} (${evt.time})`}
                      >
                        <span className="truncate font-semibold">{evt.title}</span>
                      </div>
                    );
                  })}

                  {day.events.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(day.dateStr);
                      }}
                      className="text-[9px] font-mono text-[#0A66C2] dark:text-blue-400 hover:text-[#004182] dark:hover:text-blue-300 font-semibold"
                    >
                      +{day.events.length - 2} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DAY SCHEDULE & HOLIDAY FOCUS (Today / Selected Date Inspector)          */}
      {/* ========================================================================= */}
      <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 space-y-4 shadow-sm">
        {/* Day Header with Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E8E8] dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#56687A] dark:text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
                Day Schedule & Details
              </span>
              {selectedDate === todayDateStr ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Today
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-400 border border-[#D9D9D9] dark:border-slate-700">
                  {selectedDate}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1D2226] dark:text-slate-100 tracking-tight">
              {formattedSelectedDate}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#F3F6F8] dark:bg-slate-800 rounded-lg p-0.5 border border-[#D9D9D9] dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 rounded text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {selectedDate !== todayDateStr && (
                <button
                  type="button"
                  onClick={handleResetToday}
                  className="px-2 py-1 text-[11px] font-semibold text-[#0A66C2] dark:text-blue-400 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 rounded transition"
                >
                  Jump to Today
                </button>
              )}
              <button
                type="button"
                onClick={handleNextDay}
                className="p-1.5 rounded text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 transition"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button
              size="xs"
              variant="primary"
              onClick={() => openAddModalForDate(selectedDate)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Milestone
            </Button>
          </div>
        </div>

        {/* Day Content: Holiday Banner + Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Holiday Card (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col">
            {selectedDateHoliday ? (
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-slate-900 border border-amber-500/30 flex flex-col justify-between h-full space-y-3 shadow-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{selectedDateHoliday.icon}</span>
                    <Badge variant="warning" size="sm">
                      {selectedDateHoliday.type}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Holiday & Observance
                    </span>
                    <h4 className="text-base font-bold text-[#1D2226] dark:text-slate-100">
                      {selectedDateHoliday.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedDateHoliday.description}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-800/80 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 font-mono flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    Note: Recruiter responses or scheduled technical rounds may follow holiday schedules today.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/60 border border-[#E8E8E8] dark:border-slate-700 flex flex-col justify-between h-full space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">📅</span>
                    <Badge variant="neutral" size="sm">
                      Business Day
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#56687A] dark:text-slate-400">
                      Standard Calendar Day
                    </span>
                    <h4 className="text-sm font-bold text-[#1D2226] dark:text-slate-100">
                      Regular Working Day
                    </h4>
                  </div>
                  <p className="text-xs text-[#56687A] dark:text-slate-400 leading-relaxed">
                    No national or public holidays scheduled for this date. Regular recruitment schedules, technical assessments, and interview loops proceed as normal.
                  </p>
                </div>

                {monthHolidays.length > 0 && (
                  <div className="pt-2 border-t border-[#E8E8E8] dark:border-slate-700 text-[11px] text-[#56687A] dark:text-slate-400">
                    <span>
                      {monthNames[currentMonth]} has{' '}
                      <strong className="text-[#1D2226] dark:text-slate-200">
                        {monthHolidays.length} holiday{monthHolidays.length > 1 ? 's' : ''}
                      </strong>
                      . Plan interview prep and application submissions accordingly.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Milestones for This Date (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1D2226] dark:text-slate-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
                  Scheduled Milestones on this Day ({selectedDateEvents.length})
                </h4>
              </div>

              {selectedDateEvents.length === 0 ? (
                <div className="p-5 text-center border border-dashed border-[#D9D9D9] dark:border-slate-700 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/40 space-y-2">
                  <CalendarCheck2 className="w-7 h-7 mx-auto text-[#788896] dark:text-slate-500" />
                  <p className="text-xs font-semibold text-[#1D2226] dark:text-slate-200">
                    No career milestones scheduled for this date.
                  </p>
                  <p className="text-[11px] text-[#788896] dark:text-slate-400 max-w-sm mx-auto">
                    Take advantage of this day for technical preparation, LeetCode practice, or submitting targeted applications.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => openAddModalForDate(selectedDate)}
                    icon={<Plus className="w-3 h-3" />}
                    className="mt-1"
                  >
                    Schedule Milestone
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((evt) => {
                    const conf = eventTypeConfig[evt.type];

                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/70 border border-[#E8E8E8] dark:border-slate-700/80 hover:border-[#0A66C2]/40 dark:hover:border-blue-500/50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 group shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={conf.badge} size="sm">
                              {evt.type}
                            </Badge>
                            <span className="text-[11px] font-mono font-semibold text-[#0A66C2] dark:text-blue-400">
                              {evt.time}
                            </span>
                            {evt.company && (
                              <span className="text-xs font-mono font-medium text-[#56687A] dark:text-slate-400">
                                • {evt.company}
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 group-hover:text-[#0A66C2] dark:group-hover:text-blue-400 transition">
                            {evt.title}
                          </h5>
                          {evt.notes && (
                            <p className="text-[11px] text-[#56687A] dark:text-slate-400 line-clamp-1">
                              {evt.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {evt.locationOrUrl?.startsWith('http') && (
                            <a
                              href={evt.locationOrUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 rounded bg-[#0A66C2] dark:bg-blue-600 text-white text-[10px] font-mono font-semibold hover:bg-[#004182] transition flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" /> Join
                            </a>
                          )}
                          <span className="text-[11px] text-[#0A66C2] dark:text-blue-400 font-semibold font-mono group-hover:translate-x-0.5 transition">
                            View →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. UPCOMING AGENDA PREVIEW (Chronological Timeline)                       */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8] dark:border-slate-800">
          <h3 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 uppercase font-mono tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#0A66C2] dark:text-blue-400" />
            Upcoming Milestone Agenda
          </h3>
          <span className="text-[11px] font-mono text-[#788896] dark:text-slate-400">Chronological Order</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#D9D9D9] dark:border-slate-700 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/40">
            <p className="text-xs font-semibold text-[#1D2226] dark:text-slate-200">No events scheduled.</p>
            <p className="text-[11px] text-[#788896] dark:text-slate-400 mt-1">Add your upcoming interviews, assessment deadlines, or follow-ups.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEvents.slice(0, 6).map((evt) => {
              const conf = eventTypeConfig[evt.type];

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/70 border border-[#E8E8E8] dark:border-slate-700/80 hover:border-[#0A66C2]/40 dark:hover:border-blue-500/50 transition cursor-pointer flex flex-col justify-between space-y-2 group shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={conf.badge} size="sm">
                        {evt.type}
                      </Badge>
                      <span className="text-[10px] font-mono text-[#788896] dark:text-slate-400">
                        {evt.date} • {evt.time}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 group-hover:text-[#0A66C2] dark:group-hover:text-blue-400 transition truncate">
                      {evt.title}
                    </h4>
                    {evt.company && (
                      <p className="text-[11px] text-[#56687A] dark:text-slate-400 font-mono">{evt.company}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] dark:border-slate-700/70 text-[10px] font-mono text-[#788896] dark:text-slate-400">
                    <span className="truncate">{evt.locationOrUrl || 'Virtual Session'}</span>
                    <span className="text-[#0A66C2] dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition">
                      Details →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 5. EVENT DETAILS INSPECTOR MODAL                                          */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <Modal
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.title}
          subtitle={`${selectedEvent.date} at ${selectedEvent.time} • ${selectedEvent.company || 'CareerX'}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Badge variant={eventTypeConfig[selectedEvent.type].badge} size="sm">
                {selectedEvent.type}
              </Badge>
              {selectedEvent.isSyncedWithGoogle && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Synced with Google Calendar
                </span>
              )}
            </div>

            {selectedEvent.notes && (
              <div className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/90 border border-[#D9D9D9] dark:border-slate-700 text-[#38434F] dark:text-slate-200 leading-relaxed">
                {selectedEvent.notes}
              </div>
            )}

            {selectedEvent.locationOrUrl && (
              <div className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/90 border border-[#D9D9D9] dark:border-slate-700 flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#56687A] dark:text-slate-400">Meeting Link / Platform:</span>
                <a
                  href={selectedEvent.locationOrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0A66C2] dark:text-blue-400 hover:text-[#004182] dark:hover:text-blue-300 font-bold flex items-center gap-1 truncate max-w-[220px]"
                >
                  <span>{selectedEvent.locationOrUrl}</span>
                  <ExternalLink className="w-3 h-3 text-[#788896] dark:text-slate-400" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] dark:border-slate-800">
              <Button
                size="xs"
                variant="danger"
                icon={<Trash2 className="w-3 h-3" />}
                onClick={() => handleDeleteEvent(selectedEvent.id)}
              >
                Delete Event
              </Button>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="ghost" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
                <Link to="/applications">
                  <Button size="xs" variant="outline" icon={<Briefcase className="w-3 h-3 text-[#0A66C2] dark:text-blue-400" />}>
                    Applications
                  </Button>
                </Link>
                {selectedEvent.locationOrUrl?.startsWith('http') && (
                  <a href={selectedEvent.locationOrUrl} target="_blank" rel="noreferrer">
                    <Button size="xs" variant="primary" icon={<Video className="w-3 h-3" />}>
                      Join Meeting
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 6. ADD EVENT MODAL                                                        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Schedule Calendar Milestone"
          subtitle="Add a technical interview, application deadline, assessment cutoff, or follow-up"
          maxWidth="md"
        >
          <form onSubmit={(e) => { e.preventDefault(); handleAddEvent(); }} className="space-y-3.5 text-xs">
            <div>
              <label className="text-xs font-semibold text-[#38434F] dark:text-slate-300 block mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g. Stripe Technical Onsite Loop"
                className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-500 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#38434F] dark:text-slate-300 block mb-1">
                  Category *
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, type: e.target.value as CalendarEventType })
                  }
                  className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-blue-500"
                >
                  <option value="Interview">Interview</option>
                  <option value="Deadline">Deadline</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Assessment">Assessment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#38434F] dark:text-slate-300 block mb-1">Company</label>
                <input
                  type="text"
                  value={newEvent.company}
                  onChange={(e) => setNewEvent({ ...newEvent, company: e.target.value })}
                  placeholder="e.g. Stripe"
                  className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-500 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#38434F] dark:text-slate-300 block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#38434F] dark:text-slate-300 block mb-1">Time *</label>
                <input
                  type="text"
                  required
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  placeholder="e.g. 10:00 AM"
                  className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-500 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#38434F] dark:text-slate-300 block mb-1">
                Meeting Link or Location
              </label>
              <input
                type="text"
                value={newEvent.locationOrUrl}
                onChange={(e) => setNewEvent({ ...newEvent, locationOrUrl: e.target.value })}
                placeholder="e.g. https://meet.google.com/xyz"
                className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-500 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#38434F] dark:text-slate-300 block mb-1">Notes</label>
              <textarea
                rows={2}
                value={newEvent.notes}
                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                placeholder="Topics to prepare, panel names, questions to ask..."
                className="w-full bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 placeholder-[#788896] dark:placeholder-slate-500 text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] dark:focus:ring-blue-500 resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8E8] dark:border-slate-800">
              <Button type="button" size="xs" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="xs" variant="primary">
                Save to Calendar
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CalendarPage;
