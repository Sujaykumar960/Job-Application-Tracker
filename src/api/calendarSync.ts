import { apiClient } from './client';

export type CalendarEventType = 'Interview' | 'Deadline' | 'Follow-up' | 'Assessment';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. '09:30 AM'
  endTime?: string;
  company?: string;
  locationOrUrl?: string;
  notes?: string;
  googleCalendarEventId?: string;
  isSyncedWithGoogle?: boolean;
}

export interface GoogleCalendarSyncResult {
  success: boolean;
  syncedCount: number;
  lastSyncedAt: string;
  accountEmail: string;
}

/**
 * Calendar Sync Service prepared for Google Calendar OAuth2 & REST API v3.
 * Supports exporting RFC 5545 iCalendar (.ics) files and syncing with backend Google Calendar webhook.
 */
export const calendarSyncApi = {
  /**
   * Fetch calendar events from backend
   */
  getEvents: async (): Promise<CalendarEvent[]> => {
    const response = await apiClient.get<CalendarEvent[]>('/calendar/events');
    return response.data;
  },

  /**
   * Fetch a single calendar event by id
   */
  getEventById: async (id: string): Promise<CalendarEvent> => {
    const response = await apiClient.get<CalendarEvent>(`/calendar/events/${id}`);
    return response.data;
  },

  /**
   * Create a new calendar event
   */
  createEvent: async (eventData: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await apiClient.post<CalendarEvent>('/calendar/events', eventData);
    return response.data;
  },

  /**
   * Update an existing calendar event
   */
  updateEvent: async (id: string, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await apiClient.patch<CalendarEvent>(`/calendar/events/${id}`, eventData);
    return response.data;
  },

  /**
   * Delete a calendar event
   */
  deleteEvent: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/calendar/events/${id}`);
    return response.data;
  },

  /**
   * Executes real sync with Google Calendar API.
   */
  syncWithGoogle: async (): Promise<GoogleCalendarSyncResult> => {
    const response = await apiClient.post<GoogleCalendarSyncResult>('/calendar/google/sync');
    return response.data;
  },

  /**
   * Generates standard RFC 5545 iCalendar format string for importing to Google Calendar / Apple Calendar.
   */
  generateIcsContent: (events: CalendarEvent[]): string => {
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CareerX//Engineering Career Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach((evt) => {
      const dtStart = evt.date.replace(/-/g, '') + 'T120000Z';
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${evt.id}@careerx.io`);
      ics.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      ics.push(`DTSTART:${dtStart}`);
      ics.push(`SUMMARY:${evt.title} (${evt.company || 'CareerX'})`);
      ics.push(`DESCRIPTION:${evt.notes || evt.type}`);
      if (evt.locationOrUrl) {
        ics.push(`LOCATION:${evt.locationOrUrl}`);
      }
      ics.push('STATUS:CONFIRMED');
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  },

  /**
   * Triggers download of .ics file for Google Calendar import.
   */
  downloadIcs: (events: CalendarEvent[]) => {
    const icsString = calendarSyncApi.generateIcsContent(events);
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'careerx_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
