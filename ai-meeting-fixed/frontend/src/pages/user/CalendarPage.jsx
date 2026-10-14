import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Video, CheckSquare, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from 'date-fns';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start, end });

  // Pad start
  const startPad = start.getDay();
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', format(start, 'yyyy-MM'), format(end, 'yyyy-MM')],
    queryFn: () => api.get('/calendar/events', {
      params: { start: start.toISOString(), end: end.toISOString() }
    }).then(r => r.data.data),
  });

  const getEventsForDay = (day) => {
    if (!day || !events) return [];
    return events.filter(e => e.start && isSameDay(new Date(e.start), day));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="btn-secondary p-2">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700 min-w-36 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="btn-secondary p-2">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-sm">Today</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="p-3 text-center text-xs font-semibold text-slate-500 uppercase">{d}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary-600" /></div>
        ) : (
          <div className="grid grid-cols-7">
            {paddedDays.map((day, i) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              return (
                <div key={i} className={`min-h-24 p-2 border-b border-r border-slate-50 ${!day ? 'bg-slate-50/50' : ''} ${day && isToday(day) ? 'bg-primary-50' : ''}`}>
                  {day && (
                    <>
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-primary-600 text-white' : 'text-slate-700'}`}>
                        {format(day, 'd')}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev, j) => (
                          <button key={j}
                            onClick={() => ev.type === 'meeting' ? navigate(`/meetings/${ev.id}`) : navigate('/tasks')}
                            className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium ${ev.type === 'meeting' ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                            {ev.type === 'meeting' ? '🎥' : '✓'} {ev.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-xs text-slate-400 pl-1">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-slate-500">
        <span className="flex items-center gap-2"><span className="w-3 h-3 bg-primary-200 rounded"></span> Meeting</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-200 rounded"></span> Task deadline</span>
      </div>
    </div>
  );
}
