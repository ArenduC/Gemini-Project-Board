import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SearchIcon, BookmarkPlusIcon, XIcon, MoreVerticalIcon, CheckIcon, CopyIcon, TrashIcon, Edit2Icon, SaveIcon, PlusIcon } from './Icons';
import { FilterSegment, User, TaskPriority, Sprint } from '../types';
import { useConfirmation } from '../App';
import { SaveViewModal } from './SaveViewModal';

interface FiltersProps {
  projectId: string;
  currentUser: User;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  priorityFilter: string[];
  setPriorityFilter: (value: string[]) => void;
  assigneeFilter: string[];
  setAssigneeFilter: (value: string[]) => void;
  statusFilter?: string[];
  setStatusFilter?: (value: string[]) => void;
  tagFilter: string[];
  setTagFilter: (value: string[]) => void;
  sprintFilter: string[];
  setSprintFilter: (value: string[]) => void;
  sprints: Sprint[];
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  relativeTimeValue: string;
  setRelativeTimeValue: (value: string) => void;
  relativeTimeUnit: FilterSegment['filters']['relativeTimeUnit'];
  setRelativeTimeUnit: (value: FilterSegment['filters']['relativeTimeUnit']) => void;
  relativeTimeCondition: FilterSegment['filters']['relativeTimeCondition'];
  setRelativeTimeCondition: (value: FilterSegment['filters']['relativeTimeCondition']) => void;
  assignees: string[];
  statuses?: string[];
  tags: string[];
  segments: FilterSegment[];
  activeSegmentId: string | null;
  onAddSegment: (name: string, filters: FilterSegment['filters']) => Promise<void>;
  onUpdateSegment: (segmentId: string, updates: { name?: string, filters?: FilterSegment['filters'] }) => Promise<void>;
  onDeleteSegment: (segmentId: string) => Promise<void>;
  onApplySegment: (segmentId: string | null) => void;
  onClearFilters: () => void;
}

const MultiSelectFilter: React.FC<{
    label: string;
    options: { value: string; label: string; }[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    onRemove: () => void;
}> = ({ label, options, selectedValues, onChange, onRemove }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const toggleOption = (optionValue: string) => {
        const newSelected = selectedValues.includes(optionValue) ? selectedValues.filter(v => v !== optionValue) : [...selectedValues, optionValue];
        onChange(newSelected);
    };
    const displayLabel = useMemo(() => {
        const count = selectedValues.length;
        if (count === 0) return 'All';
        const firstLabel = options.find(o => o.value === selectedValues[0])?.label || '';
        return count === 1 ? firstLabel : `${firstLabel} +${count - 1}`;
    }, [selectedValues, options]);
    return (
        <div className="relative flex-shrink-0" ref={ref}>
            <div className="flex items-center gap-0 bg-[#131C1B] border border-white/5 rounded-xl overflow-hidden h-10 shadow-lg">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 pl-3 pr-2 py-1.5 hover:bg-white/5 transition-colors h-full">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.15em] whitespace-nowrap">{label}</span>
                    <span className="text-[10px] text-white font-bold truncate max-w-[80px]">{displayLabel}</span>
                </button>
                <button type="button" onClick={onRemove} className="p-2 text-gray-500 hover:text-white hover:bg-red-500/10 border-l border-white/5 h-full transition-colors"><XIcon className="w-3.5 h-3.5"/></button>
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#131C1B] border border-gray-800 rounded-xl shadow-2xl z-[60] max-h-64 overflow-y-auto custom-scrollbar py-2 ring-1 ring-white/5">
                    {options.map(option => (
                        <label key={option.value} className="flex items-center gap-3 px-4 py-2 text-[11px] text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
                            <input type="checkbox" checked={selectedValues.includes(option.value)} onChange={() => toggleOption(option.value)} className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-emerald-500/50" />
                            <span className="font-medium">{option.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Filters: React.FC<FiltersProps> = ({
  projectId, currentUser, searchTerm, setSearchTerm, priorityFilter, setPriorityFilter, assigneeFilter, setAssigneeFilter, statusFilter, setStatusFilter, tagFilter, setTagFilter, sprintFilter, setSprintFilter, sprints, startDate, setStartDate, endDate, setEndDate, relativeTimeValue, setRelativeTimeValue, relativeTimeUnit, setRelativeTimeUnit, relativeTimeCondition, setRelativeTimeCondition, assignees, statuses, tags, segments, activeSegmentId, onAddSegment, onUpdateSegment, onDeleteSegment, onApplySegment, onClearFilters,
}) => {
  const [visibleFilters, setVisibleFilters] = useState<Set<string>>(new Set());
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const addFilterButtonRef = useRef<HTMLDivElement>(null);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (addFilterButtonRef.current && !addFilterButtonRef.current.contains(event.target as Node)) setIsAddFilterOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterTypes = useMemo(() => [
    { id: 'priority', name: 'Priority' },
    { id: 'assignee', name: 'Assignee' },
    ...(statuses && setStatusFilter ? [{ id: 'status', name: 'Status' }] : []),
    { id: 'tag', name: 'Tag' },
    { id: 'sprint', name: 'Sprint' },
    { id: 'date', name: 'Range' },
  ], [statuses, setStatusFilter]);

  const addFilter = (type: string) => { setVisibleFilters(prev => new Set(prev).add(type)); setIsAddFilterOpen(false); };
  const removeFilter = (type: string) => {
    setVisibleFilters(prev => { const next = new Set(prev); next.delete(type); return next; });
    if (type === 'priority') setPriorityFilter([]);
    if (type === 'assignee') setAssigneeFilter([]);
    if (type === 'status' && setStatusFilter) setStatusFilter([]);
    if (type === 'tag') setTagFilter([]);
    if (type === 'sprint') setSprintFilter([]);
    if (type === 'date') { setStartDate(''); setEndDate(''); }
  };

  const currentFilters = useMemo(() => ({ searchTerm, priorityFilter, assigneeFilter, statusFilter: statusFilter || [], tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition }), [searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition]);
  const hasActiveFilters = Object.values(currentFilters).some(v => (Array.isArray(v) ? v.length > 0 : v !== ''));

  return (
    <div className="flex items-center gap-3 flex-wrap flex-grow">
      {/* Search Input */}
      <div className="relative flex-grow max-w-sm">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          type="text" 
          placeholder="Neural Search..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-10 pr-4 py-2 w-full border border-white/5 rounded-xl bg-[#1C2326] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[11px] font-medium h-10 shadow-inner" 
        />
      </div>
      
      {/* Dynamic Multi-Select Badges */}
      {visibleFilters.has('priority') && <MultiSelectFilter label="PRIORITY" options={Object.values(TaskPriority).map(p => ({ value: p, label: p }))} selectedValues={priorityFilter} onChange={setPriorityFilter} onRemove={() => removeFilter('priority')} />}
      {visibleFilters.has('assignee') && <MultiSelectFilter label="ASSIGNEE" options={assignees.map(a => ({ value: a, label: a }))} selectedValues={assigneeFilter} onChange={setAssigneeFilter} onRemove={() => removeFilter('assignee')} />}
      {visibleFilters.has('status') && statuses && setStatusFilter && <MultiSelectFilter label="STATUS" options={statuses.map(s => ({ value: s, label: s }))} selectedValues={statusFilter || []} onChange={setStatusFilter} onRemove={() => removeFilter('status')} />}
      {visibleFilters.has('tag') && <MultiSelectFilter label="TAG" options={tags.map(t => ({ value: t, label: t }))} selectedValues={tagFilter} onChange={setTagFilter} onRemove={() => removeFilter('tag')} />}
      {visibleFilters.has('sprint') && <MultiSelectFilter label="SPRINT" options={sprints.map(s => ({ value: s.id, label: s.name }))} selectedValues={sprintFilter} onChange={setSprintFilter} onRemove={() => removeFilter('sprint')} />}
      
      {/* Add Filter Button */}
      <div className="relative flex-shrink-0" ref={addFilterButtonRef}>
          <button 
            onClick={() => setIsAddFilterOpen(prev => !prev)} 
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all h-10"
          >
              <PlusIcon className="w-4 h-4 text-emerald-400"/> Filter
          </button>
          {isAddFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-[#131C1B] border border-gray-800 rounded-xl shadow-2xl z-[60] py-2 ring-1 ring-white/5">
                  {filterTypes.filter(ft => !visibleFilters.has(ft.id)).map(filter => (
                      <button key={filter.id} onClick={() => addFilter(filter.id)} className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        {filter.name}
                      </button>
                  ))}
              </div>
          )}
      </div>

      {/* Global Filter Actions */}
      {hasActiveFilters && (
          <div className="flex items-center gap-1 border-l border-white/10 pl-3 h-10">
              <button 
                onClick={onClearFilters} 
                className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-red-400 transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={() => setSaveModalOpen(true)} 
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all h-10 shadow-lg shadow-emerald-500/5"
              >
                  <BookmarkPlusIcon className="w-3.5 h-3.5" /> Save
              </button>
          </div>
      )}

      <SaveViewModal isOpen={isSaveModalOpen} onClose={() => setSaveModalOpen(false)} onSave={async (name: string) => { await onAddSegment(name, currentFilters); setSaveModalOpen(false); }} />
    </div>
  );
};