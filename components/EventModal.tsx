import React, { useState, FormEvent, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { XIcon, LoaderCircleIcon, TrashIcon } from './Icons';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'creatorId' | 'projectId'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  event?: CalendarEvent | null;
  selectedDate: string; // YYYY-MM-DD
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, onDelete, event, selectedDate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      const start = new Date(event.start);
      const end = new Date(event.end);
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().substring(0, 5));
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().substring(0, 5));
    } else {
      // Pre-fill with selected date and a default time
      setTitle('');
      setDescription('');
      setStartDate(selectedDate);
      setStartTime('10:00');
      setEndDate(selectedDate);
      setEndTime('11:00');
    }
  }, [event, selectedDate, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !startTime || !endDate || !endTime) return;
    setIsSaving(true);
    
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (startDateTime >= endDateTime) {
      alert("End time must be after start time.");
      setIsSaving(false);
      return;
    }

    await onSave({
      title,
      description,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
    });
    setIsSaving(false);
    onClose();
  };
  
  const handleDelete = async () => {
    if (onDelete && window.confirm("Are you sure you want to delete this event?")) {
        setIsDeleting(true);
        await onDelete();
        setIsDeleting(false);
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">{event ? 'Edit Event' : 'Create Event'}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><XIcon className="w-6 h-6" /></button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" required className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">&nbsp;</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">End</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">&nbsp;</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div>
                {event && onDelete && (
                    <button type="button" onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-900/50 text-red-400 font-semibold rounded-lg hover:bg-red-900/80 disabled:opacity-50 flex items-center gap-2">
                        {isDeleting ? <LoaderCircleIcon className="w-5 h-5 animate-spin"/> : <TrashIcon className="w-5 h-5"/>} Delete
                    </button>
                )}
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 disabled:opacity-50 flex items-center gap-2">
                {isSaving && <LoaderCircleIcon className="w-5 h-5 animate-spin"/>} {event ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
