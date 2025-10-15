import React, { useState, useMemo } from 'react';
import { Project, User, Task, CalendarEvent } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './Icons';
import { EventModal } from './EventModal';

interface CalendarViewProps {
  project: Project;
  currentUser: User;
  onTaskClick: (task: Task) => void;
  onAddEvent: (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({ project, currentUser, onTaskClick, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const calendarGrid = useMemo(() => {
    const grid = [];
    let day = 1;
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          week.push(null);
        } else if (day > daysInMonth) {
          week.push(null);
        } else {
          week.push(new Date(year, month, day));
          day++;
        }
      }
      grid.push(week);
      if (day > daysInMonth) break;
    }
    return grid;
  }, [year, month, daysInMonth, firstDay]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { tasks: Task[], events: CalendarEvent[] }>();
    
    // FIX: Cast Object.values to the correct type to avoid type inference issues.
    (Object.values(project.board.tasks) as Task[]).forEach(task => {
        if (task.dueDate) {
            const dateKey = task.dueDate;
            if (!map.has(dateKey)) map.set(dateKey, { tasks: [], events: [] });
            map.get(dateKey)!.tasks.push(task);
        }
    });

    // FIX: Cast Object.values to the correct type to avoid type inference issues.
    (Object.values(project.calendarEvents) as CalendarEvent[]).forEach(event => {
        const dateKey = event.start.split('T')[0];
        if (!map.has(dateKey)) map.set(dateKey, { tasks: [], events: [] });
        map.get(dateKey)!.events.push(event);
    });

    return map;
  }, [project.board.tasks, project.calendarEvents]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const openAddEventModal = (date: Date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
    setSelectedEvent(null);
    setEventModalOpen(true);
  };
  
  const openEditEventModal = (event: CalendarEvent) => {
    setSelectedDate(event.start.split('T')[0]);
    setSelectedEvent(event);
    setEventModalOpen(true);
  };
  
  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'creatorId' | 'projectId'>) => {
    if (selectedEvent) {
      await onUpdateEvent(selectedEvent.id, eventData);
    } else {
      await onAddEvent({
        ...eventData,
        projectId: project.id,
        creatorId: currentUser.id,
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      await onDeleteEvent(selectedEvent.id);
    }
  };


  return (
    <div className="bg-[#1C2326]/50 p-4 sm:p-6 rounded-lg text-white">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long' })} {year}</h2>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-800"><ChevronLeftIcon className="w-6 h-6"/></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-semibold rounded-md hover:bg-gray-800">Today</button>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-800"><ChevronRightIcon className="w-6 h-6"/></button>
        </div>
      </header>

      <div className="grid grid-cols-7 border-t border-r border-gray-800">
        {dayNames.map(day => (
          <div key={day} className="py-2 text-center text-sm font-semibold text-gray-400 border-l border-b border-gray-800 bg-[#131C1B]/50">{day}</div>
        ))}
        {calendarGrid.map((week, i) => (
          <React.Fragment key={i}>
            {week.map((date, j) => {
              const dateKey = date ? date.toISOString().split('T')[0] : '';
              const dayEvents = date ? eventsByDate.get(dateKey) : null;
              const isToday = date && date.toDateString() === new Date().toDateString();
              return (
                <div key={j} className="h-32 border-l border-b border-gray-800 p-2 flex flex-col group relative">
                  {date && (
                    <>
                      <time dateTime={date.toISOString()} className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-gray-300 text-black' : ''}`}>
                        {date.getDate()}
                      </time>
                      <div className="mt-1 overflow-y-auto custom-scrollbar-thin flex-grow">
                         {dayEvents?.events.map(event => (
                             <button key={event.id} onClick={() => openEditEventModal(event)} className="block w-full text-left text-xs bg-blue-800/70 hover:bg-blue-700 p-1 rounded mb-1 truncate">
                                {event.title}
                            </button>
                         ))}
                         {dayEvents?.tasks.map(task => (
                             <button key={task.id} onClick={() => onTaskClick(task)} className="block w-full text-left text-xs bg-gray-700/70 hover:bg-gray-600 p-1 rounded mb-1 truncate">
                                {task.title}
                            </button>
                         ))}
                      </div>
                      <button onClick={() => openAddEventModal(date)} className="absolute bottom-2 right-2 p-1 bg-gray-700 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-gray-600 transition-opacity" aria-label="Add event">
                        <PlusIcon className="w-4 h-4"/>
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
       {isEventModalOpen && (
        <EventModal
            isOpen={isEventModalOpen}
            onClose={() => setEventModalOpen(false)}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
            event={selectedEvent}
            selectedDate={selectedDate}
        />
      )}
    </div>
  );
};
