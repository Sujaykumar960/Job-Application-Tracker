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
} from 'lucide-react';
import { cn } from '../utils/cn';

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

  // Current calendar month state (defaulting to September 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 0-indexed: 8 is September

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
      date: '2026-09-08',
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

  const handleResetToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(8); // September 2026
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
    date: '2026-09-08',
    time: '10:00 AM',
    company: '',
    locationOrUrl: '',
    notes: '',
  });

  // Color config for the 4 requested event types
  const eventTypeConfig: Record<
    CalendarEventType,
    { label: string; bg: string; text: string; border: string; badge: 'brand' | 'danger' | 'warning' | 'success' }
  > = {
    Interview: {
      label: 'Interview',
      bg: 'bg-[#E8F3FF]',
      text: 'text-[#0A66C2]',
      border: 'border-[#d0e6fc]',
      badge: 'brand',
    },
    Deadline: {
      label: 'Deadline',
      bg: 'bg-[#FCE8E6]',
      text: 'text-[#B3261E]',
      border: 'border-[#f8cbc7]',
      badge: 'danger',
    },
    'Follow-up': {
      label: 'Follow-up',
      bg: 'bg-[#FFF4CC]',
      text: 'text-[#8A6100]',
      border: 'border-[#ffe899]',
      badge: 'warning',
    },
    Assessment: {
      label: 'Assessment',
      bg: 'bg-[#E6F4EA]',
      text: 'text-[#137333]',
      border: 'border-[#c6ecd2]',
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
      <div className="p-3 rounded-xl bg-white border border-[#D9D9D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-[#1D2226]">
              <span>Google Calendar API Integration Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-[#56687A]">
              {syncStatus ? (
                <>Synced with <strong className="text-[#1D2226]">{syncStatus.accountEmail}</strong> • Last updated {syncStatus.lastSyncedAt}</>
              ) : (
                'Sync not yet performed'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-[#56687A] self-end sm:self-center">
          <span className="px-2 py-0.5 rounded bg-[#F3F6F8] border border-[#D9D9D9]">
            {events.filter((e) => e.isSyncedWithGoogle).length} Events Synced
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CALENDAR TOOLBAR: MONTH CONTROLS & EVENT FILTERS                       */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#D9D9D9] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[#1D2226] tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0A66C2]" />
            <span>
              {monthNames[currentMonth]} {currentYear}
            </span>
          </h2>

          <div className="flex items-center bg-[#F3F6F8] rounded-lg p-0.5 border border-[#D9D9D9]">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded text-[#56687A] hover:text-[#1D2226] hover:bg-[#E8E8E8] transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetToday}
              className="px-2 py-0.5 text-[11px] font-semibold text-[#1D2226] hover:bg-[#E8E8E8] rounded transition"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded text-[#56687A] hover:text-[#1D2226] hover:bg-[#E8E8E8] transition"
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
                    ? 'bg-[#0A66C2] text-white shadow-sm'
                    : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
                )}
              >
                <span>{type === 'All' ? 'All Milestones' : `${type}s`}</span>
                <span className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                  selectedEventType === type ? 'bg-[#004182] text-white' : 'bg-[#F3F6F8] text-[#56687A]'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN MONTHLY CALENDAR GRID                                             */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-white border border-[#D9D9D9] overflow-x-auto shadow-sm">
        <div className="min-w-[640px]">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 bg-[#F3F6F8] border-b border-[#D9D9D9] text-center text-[11px] font-mono font-bold uppercase text-[#56687A] py-2.5">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#E8E8E8] bg-[#E8E8E8]">
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={cn(
                'min-h-[105px] p-2 flex flex-col justify-between transition',
                day.isCurrentMonth ? 'bg-white' : 'bg-[#F3F6F8]',
                day.dateStr === '2026-09-03' ? 'border-2 border-[#0A66C2] bg-[#E8F3FF]/40' : ''
              )}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-mono font-bold',
                    day.dateStr === '2026-09-03'
                      ? 'w-5 h-5 rounded-full bg-[#0A66C2] text-white flex items-center justify-center'
                      : day.isCurrentMonth
                      ? 'text-[#1D2226]'
                      : 'text-[#9AA5B1]'
                  )}
                >
                  {day.dayNumber}
                </span>
              </div>

              {/* Day Events Chips */}
              <div className="space-y-1 mt-1 flex-1">
                {day.events.slice(0, 2).map((evt) => {
                  const conf = eventTypeConfig[evt.type];

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
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
                    onClick={() => setSelectedEvent(day.events[0])}
                    className="text-[9px] font-mono text-[#0A66C2] hover:text-[#004182] font-semibold"
                  >
                    +{day.events.length - 2} more
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. UPCOMING AGENDA PREVIEW (Chronological Timeline)                       */}
      {/* ========================================================================= */}
      <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
          <h3 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#0A66C2]" />
            Upcoming Milestone Agenda
          </h3>
          <span className="text-[11px] font-mono text-[#788896]">Chronological Order</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#D9D9D9] rounded-xl bg-[#F3F6F8]">
            <p className="text-xs font-semibold text-[#1D2226]">No events scheduled.</p>
            <p className="text-[11px] text-[#788896] mt-1">Add your upcoming interviews, assessment deadlines, or follow-ups.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEvents.slice(0, 6).map((evt) => {
              const conf = eventTypeConfig[evt.type];

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] hover:border-[#0A66C2]/40 transition cursor-pointer flex flex-col justify-between space-y-2 group shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={conf.badge} size="sm">
                        {evt.type}
                      </Badge>
                      <span className="text-[10px] font-mono text-[#788896]">
                        {evt.date} • {evt.time}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition truncate">
                      {evt.title}
                    </h4>
                    {evt.company && (
                      <p className="text-[11px] text-[#56687A] font-mono">{evt.company}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] text-[10px] font-mono text-[#788896]">
                    <span className="truncate">{evt.locationOrUrl || 'Virtual Session'}</span>
                    <span className="text-[#0A66C2] font-semibold group-hover:translate-x-0.5 transition">
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
          <div className="space-y-4 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Badge variant={eventTypeConfig[selectedEvent.type].badge} size="sm">
                {selectedEvent.type}
              </Badge>
              {selectedEvent.isSyncedWithGoogle && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Synced with Google Calendar
                </span>
              )}
            </div>

            {selectedEvent.notes && (
              <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9] text-[#38434F] leading-relaxed">
                {selectedEvent.notes}
              </div>
            )}

            {selectedEvent.locationOrUrl && (
              <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9] flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#56687A]">Meeting Link / Platform:</span>
                <a
                  href={selectedEvent.locationOrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0A66C2] hover:text-[#004182] font-bold flex items-center gap-1 truncate max-w-[220px]"
                >
                  <span>{selectedEvent.locationOrUrl}</span>
                  <ExternalLink className="w-3 h-3 text-[#788896]" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8]">
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
                  <Button size="xs" variant="outline" icon={<Briefcase className="w-3 h-3 text-[#0A66C2]" />}>
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
              <label className="text-xs font-semibold text-[#38434F] block mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g. Stripe Technical Onsite Loop"
                className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#38434F] block mb-1">
                  Category *
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, type: e.target.value as CalendarEventType })
                  }
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                >
                  <option value="Interview">Interview</option>
                  <option value="Deadline">Deadline</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Assessment">Assessment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#38434F] block mb-1">Company</label>
                <input
                  type="text"
                  value={newEvent.company}
                  onChange={(e) => setNewEvent({ ...newEvent, company: e.target.value })}
                  placeholder="e.g. Stripe"
                  className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#38434F] block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full bg-white text-[#1D2226] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#38434F] block mb-1">Time *</label>
                <input
                  type="text"
                  required
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  placeholder="e.g. 10:00 AM"
                  className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#38434F] block mb-1">
                Meeting Link or Location
              </label>
              <input
                type="text"
                value={newEvent.locationOrUrl}
                onChange={(e) => setNewEvent({ ...newEvent, locationOrUrl: e.target.value })}
                placeholder="e.g. https://meet.google.com/xyz"
                className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#38434F] block mb-1">Notes</label>
              <textarea
                rows={2}
                value={newEvent.notes}
                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                placeholder="Topics to prepare, panel names, questions to ask..."
                className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-lg border border-[#D9D9D9] p-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8E8]">
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
