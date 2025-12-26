import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SearchIcon, BookmarkPlusIcon, XIcon, MoreVerticalIcon, CheckIcon, CopyIcon, TrashIcon, Edit2Icon, SaveIcon, PlusIcon, CalendarIcon, ClockIcon } from './Icons';
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
            <div className="flex items-center bg-[#1C2326] border border-white/10 rounded-xl overflow-hidden h-9 shadow-lg group">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 pl-3 pr-2 py-1.5 hover:bg-white/5 transition-colors h-full">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">{label}</span>
                    <span className="text-[10px] text-white font-bold truncate max-w-[100px]">{displayLabel}</span>
                </button>
                <button type="button" onClick={onRemove} className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 border-l border-white/5 transition-colors">
                  <XIcon className="w-3.5 h-3.5"/>
                </button>
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

const RangeFilter: React.FC<{
    startDate: string;
    setStartDate: (v: string) => void;
    endDate: string;
    setEndDate: (v: string) => void;
    relativeValue: string;
    setRelativeValue: (v: string) => void;
    relativeUnit: FilterSegment['filters']['relativeTimeUnit'];
    setRelativeUnit: (v: FilterSegment['filters']['relativeTimeUnit']) => void;
    relativeCondition: FilterSegment['filters']['relativeTimeCondition'];
    setRelativeCondition: (v: FilterSegment['filters']['relativeTimeCondition']) => void;
    onRemove: () => void;
}> = (props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'absolute' | 'relative'>(props.relativeValue ? 'relative' : 'absolute');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayLabel = useMemo(() => {
        if (mode === 'relative' && props.relativeValue) {
            return `${props.relativeCondition === 'within' ? 'In' : 'Before'} ${props.relativeValue}${props.relativeUnit?.[0]}`;
        }
        if (props.startDate || props.endDate) {
            return 'Mesh Bound';
        }
        return 'Not Set';
    }, [mode, props]);

    return (
        <div className="relative flex-shrink-0" ref={ref}>
            <div className="flex items-center bg-[#1C2326] border border-white/10 rounded-xl overflow-hidden h-9 shadow-lg group">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 pl-3 pr-2 py-1.5 hover:bg-white/5 transition-colors h-full">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">RANGE</span>
                    <span className="text-[10px] text-white font-bold truncate max-w-[100px]">{displayLabel}</span>
                </button>
                <button type="button" onClick={props.onRemove} className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 border-l border-white/5 transition-colors">
                  <XIcon className="w-3.5 h-3.5"/>
                </button>
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#131C1B] border border-gray-800 rounded-xl shadow-2xl z-[60] p-4 ring-1 ring-white/5 space-y-4">
                    <div className="flex p-1 bg-white/5 rounded-lg">
                        <button onClick={() => setMode('absolute')} className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${mode === 'absolute' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Absolute</button>
                        <button onClick={() => setMode('relative')} className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${mode === 'relative' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Relative</button>
                    </div>
                    {mode === 'absolute' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Start Node</label>
                                <input type="date" value={props.startDate} onChange={e => { props.setStartDate(e.target.value); props.setRelativeValue(''); }} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
                            </div>
                            <div>
                                <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">End Node</label>
                                <input type="date" value={props.endDate} onChange={e => { props.setEndDate(e.target.value); props.setRelativeValue(''); }} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <select value={props.relativeCondition} onChange={e => props.setRelativeCondition(e.target.value as any)} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none">
                                    <option value="within">Within</option>
                                    <option value="older_than">Older than</option>
                                </select>
                                <input type="number" value={props.relativeValue} onChange={e => { props.setRelativeValue(e.target.value); props.setStartDate(''); props.setEndDate(''); }} placeholder="val" className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none" />
                            </div>
                            <select value={props.relativeUnit} onChange={e => props.setRelativeUnit(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none">
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                            </select>
                        </div>
                    )}
                    <button onClick={() => setIsOpen(false)} className="w-full py-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-emerald-500/20 transition-all">Apply Mesh</button>
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
    const nextVisible = new Set<string>();
    if (priorityFilter.length > 0) nextVisible.add('priority');
    if (assigneeFilter.length > 0) nextVisible.add('assignee');
    if (statusFilter && statusFilter.length > 0) nextVisible.add('status');
    if (tagFilter.length > 0) nextVisible.add('tag');
    if (sprintFilter.length > 0) nextVisible.add('sprint');
    if (startDate !== '' || endDate !== '' || relativeTimeValue !== '') nextVisible.add('date');
    
    setVisibleFilters(prev => {
        const merged = new Set(prev);
        nextVisible.forEach(f => merged.add(f));
        if (nextVisible.size === 0 && activeSegmentId === 'all') return new Set();
        return merged;
    });
  }, [priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, activeSegmentId]);

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
    if (type === 'date') { 
        setStartDate(''); setEndDate(''); 
        setRelativeTimeValue('');
    }
  };

  const currentFilters = useMemo(() => ({ searchTerm, priorityFilter, assigneeFilter, statusFilter: statusFilter || [], tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition }), [searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition]);
  
  const hasActiveFilters = useMemo(() => {
      return (
          searchTerm !== '' ||
          priorityFilter.length > 0 ||
          assigneeFilter.length > 0 ||
          (statusFilter && statusFilter.length > 0) ||
          tagFilter.length > 0 ||
          sprintFilter.length > 0 ||
          startDate !== '' ||
          endDate !== '' ||
          relativeTimeValue !== ''
      );
  }, [searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue]);

  return (
    <div className="flex items-center gap-3 flex-wrap flex-grow">
      <div className="relative flex-grow max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input 
          type="text" 
          placeholder="Neural Search..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-9 pr-4 py-2 w-full border border-white/5 rounded-xl bg-[#1C2326] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-[10px] font-medium h-9 shadow-inner" 
        />
      </div>
      
      {visibleFilters.has('priority') && <MultiSelectFilter label="PRIORITY" options={Object.values(TaskPriority).map(p => ({ value: p, label: p }))} selectedValues={priorityFilter} onChange={setPriorityFilter} onRemove={() => removeFilter('priority')} />}
      {visibleFilters.has('assignee') && <MultiSelectFilter label="ASSIGNEE" options={assignees.map(a => ({ value: a, label: a }))} selectedValues={assigneeFilter} onChange={setAssigneeFilter} onRemove={() => removeFilter('assignee')} />}
      {visibleFilters.has('status') && statuses && setStatusFilter && <MultiSelectFilter label="STATUS" options={statuses.map(s => ({ value: s, label: s }))} selectedValues={statusFilter || []} onChange={setStatusFilter} onRemove={() => removeFilter('status')} />}
      {visibleFilters.has('tag') && <MultiSelectFilter label="TAG" options={tags.map(t => ({ value: t, label: t }))} selectedValues={tagFilter} onChange={setTagFilter} onRemove={() => removeFilter('tag')} />}
      {visibleFilters.has('sprint') && <MultiSelectFilter label="SPRINT" options={sprints.map(s => ({ value: s.id, label: s.name }))} selectedValues={sprintFilter} onChange={setSprintFilter} onRemove={() => removeFilter('sprint')} />}
      {visibleFilters.has('date') && (
        <RangeFilter 
            startDate={startDate} setStartDate={setStartDate} 
            endDate={endDate} setEndDate={setEndDate} 
            relativeValue={relativeTimeValue} setRelativeValue={setRelativeTimeValue} 
            relativeUnit={relativeTimeUnit} setRelativeUnit={setRelativeTimeUnit} 
            relativeCondition={relativeTimeCondition} setRelativeCondition={setRelativeTimeCondition} 
            onRemove={() => removeFilter('date')} 
        />
      )}
      
      <div className="relative flex-shrink-0" ref={addFilterButtonRef}>
          <button 
            onClick={() => setIsAddFilterOpen(prev => !prev)} 
            className="flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all h-9"
          >
              <PlusIcon className="w-3.5 h-3.5 text-emerald-400"/> Filter
          </button>
          {isAddFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-[#131C1B] border border-gray-800 rounded-xl shadow-2xl z-[60] py-2 ring-1 ring-white/5">
                  {filterTypes.filter(ft => !visibleFilters.has(ft.id)).map(filter => (
                      <button key={filter.id} onClick={() => addFilter(filter.id)} className="w-full text-left px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        {filter.name}
                      </button>
                  ))}
              </div>
          )}
      </div>

      {hasActiveFilters && (
          <div className="flex items-center gap-1 border-l border-white/10 pl-3 h-9 flex-shrink-0">
              <button 
                onClick={onClearFilters} 
                className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors"
              >
                Reset
              </button>
              <button 
                onClick={() => setSaveModalOpen(true)} 
                className="flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all h-9"
              >
                  <BookmarkPlusIcon className="w-3.5 h-3.5" /> Save
              </button>
          </div>
      )}

      <SaveViewModal isOpen={isSaveModalOpen} onClose={() => setSaveModalOpen(false)} onSave={async (name: string) => { await onAddSegment(name, currentFilters); setSaveModalOpen(false); }} />
    </div>
  );
};