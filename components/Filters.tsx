import React, { useState, useMemo } from 'react';
import { SearchIcon, BookmarkPlusIcon, XIcon } from './Icons';
import { TaskPriority, FilterSegment } from '../types';

interface FiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (value: string) => void;
  statusFilter?: string;
  setStatusFilter?: (value: string) => void;
  assignees: string[];
  statuses?: string[];
  segments: FilterSegment[];
  activeSegmentId: string | null;
  currentFilters: { searchTerm: string; priorityFilter: string; assigneeFilter: string; statusFilter?: string; };
  onAddSegment: (name: string) => void;
  onDeleteSegment: (segmentId: string) => void;
  onApplySegment: (segmentId: string | null) => void;
  onClearFilters: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  searchTerm,
  setSearchTerm,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  statusFilter,
  setStatusFilter,
  assignees,
  statuses,
  segments,
  activeSegmentId,
  currentFilters,
  onAddSegment,
  onDeleteSegment,
  onApplySegment,
  onClearFilters,
}) => {

  const [isSaving, setIsSaving] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');

  const hasActiveFilters = currentFilters.searchTerm || currentFilters.priorityFilter || currentFilters.assigneeFilter || currentFilters.statusFilter;

  const isCurrentFilterSaved = useMemo(() => {
    if (!hasActiveFilters) return true; // Don't show save for empty filters
    return segments.some(s => 
        s.filters.searchTerm === currentFilters.searchTerm &&
        s.filters.priorityFilter === currentFilters.priorityFilter &&
        s.filters.assigneeFilter === currentFilters.assigneeFilter &&
        s.filters.statusFilter === (currentFilters.statusFilter || '')
    );
  }, [segments, currentFilters, hasActiveFilters]);

  const handleSave = () => {
    onAddSegment(newSegmentName);
    setNewSegmentName('');
    setIsSaving(false);
  };
  
  const handleStartSave = () => {
      setIsSaving(true);
      const parts = [];
      if (currentFilters.assigneeFilter) parts.push(currentFilters.assigneeFilter);
      if (currentFilters.priorityFilter) parts.push(currentFilters.priorityFilter);
      if (currentFilters.statusFilter) parts.push(currentFilters.statusFilter);
      if (currentFilters.searchTerm) parts.push(`'${currentFilters.searchTerm}'`);
      setNewSegmentName(parts.join(' & '));
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">Views</h4>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => onApplySegment('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${activeSegmentId === 'all' ? 'bg-gray-300 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
          >
            All Tasks
          </button>
          {segments.map(segment => (
            <div key={segment.id} className="relative group flex-shrink-0">
              <button
                onClick={() => onApplySegment(segment.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors pr-8 ${activeSegmentId === segment.id ? 'bg-gray-300 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
              >
                {segment.name}
              </button>
              <button 
                onClick={() => onDeleteSegment(segment.id)}
                className="absolute top-1/2 right-1.5 -translate-y-1/2 p-1 rounded-full text-inherit opacity-50 hover:opacity-100 group-hover:opacity-100"
                aria-label={`Delete segment ${segment.name}`}
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap p-3 bg-[#1C2326] rounded-lg">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-48 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
          />
        </div>
        
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
        >
          <option value="">All Priorities</option>
          {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
        >
          <option value="">All Assignees</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        
        {statuses && setStatusFilter && (
             <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                >
                <option value="">All Statuses</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        )}

        {hasActiveFilters && (
          <button 
            onClick={onClearFilters}
            className="px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 rounded-lg"
          >
            Clear Filters
          </button>
        )}

        {isSaving ? (
          <div className="flex items-center gap-2">
            <input 
              type="text"
              placeholder="Name for this view..."
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="px-3 py-2 w-48 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
              autoFocus
            />
            <button onClick={handleSave} className="px-3 py-2 bg-gray-300 text-black font-semibold rounded-lg text-sm flex-shrink-0">Save</button>
            <button onClick={() => setIsSaving(false)} className="px-3 py-2 text-sm text-white flex-shrink-0">Cancel</button>
          </div>
        ) : (
          hasActiveFilters && !isCurrentFilterSaved && (
            <button 
              onClick={handleStartSave}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-gray-800 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-700 text-white"
            >
              <BookmarkPlusIcon className="w-4 h-4" />
              Save View
            </button>
          )
        )}
      </div>
    </div>
  );
};