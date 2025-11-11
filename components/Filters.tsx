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

const ViewMenu: React.FC<{
    segment: FilterSegment;
    isCreator: boolean;
    onRename: () => void;
    onDelete: () => void;
    onShare: () => void;
}> = ({ segment, isCreator, onRename, onDelete, onShare }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    return (
        <div ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="absolute top-1/2 right-1 -translate-y-1/2 p-1.5 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={`Options for ${segment.name}`}
            >
                <MoreVerticalIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div
                    className="absolute top-full right-0 mt-1 w-40 bg-[#131C1B] border border-gray-700 rounded-md shadow-lg z-10"
                >
                    <button onClick={() => { onShare(); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-gray-800">
                        <CopyIcon className="w-4 h-4" /> Share
                    </button>
                    {isCreator && (
                        <>
                            <button onClick={() => { onRename(); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-gray-800">
                                <Edit2Icon className="w-4 h-4" /> Rename
                            </button>
                            <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-gray-800">
                                <TrashIcon className="w-4 h-4" /> Delete
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

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
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string) => {
        const newSelected = selectedValues.includes(optionValue)
            ? selectedValues.filter(v => v !== optionValue)
            : [...selectedValues, optionValue];
        onChange(newSelected);
    };

    const selectedLabels = selectedValues
        .map(v => options.find(o => o.value === v)?.label)
        .filter(Boolean) as string[];

    const displayLabel = useMemo(() => {
        const count = selectedLabels.length;
        if (count === 0) {
            return 'All';
        }
        if (count === 1) {
            return selectedLabels[0];
        }
        return `${selectedLabels[0]} & ${count - 1} more`;
    }, [selectedLabels]);

    return (
        <div className="relative" ref={ref}>
            <div className="flex items-center gap-0 bg-[#131C1B] border border-gray-800 rounded-lg">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 pl-3 pr-2 py-2">
                    <span className="text-xs font-semibold text-gray-400">{label}:</span>
                    <span className="text-xs text-white font-medium truncate max-w-[150px]">
                        {displayLabel}
                    </span>
                </button>
                <button type="button" onClick={onRemove} className="p-2 text-gray-500 hover:text-white self-stretch hover:bg-gray-700/50 rounded-r-md"><XIcon className="w-4 h-4"/></button>
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#131C1B] border border-gray-700 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto custom-scrollbar">
                    {options.map(option => (
                        <label key={option.value} className="flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-gray-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(option.value)}
                                onChange={() => toggleOption(option.value)}
                                className="w-4 h-4 rounded text-gray-500 bg-gray-700 border-gray-600 focus:ring-gray-500"
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export const Filters: React.FC<FiltersProps> = ({
  projectId,
  currentUser,
  searchTerm, setSearchTerm,
  priorityFilter, setPriorityFilter,
  assigneeFilter, setAssigneeFilter,
  statusFilter, setStatusFilter,
  tagFilter, setTagFilter,
  sprintFilter, setSprintFilter,
  sprints,
  startDate, setStartDate,
  endDate, setEndDate,
  assignees, statuses, tags,
  segments, activeSegmentId,
  onAddSegment, onUpdateSegment, onDeleteSegment,
  onApplySegment, onClearFilters,
}) => {
  const requestConfirmation = useConfirmation();
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [copiedViewId, setCopiedViewId] = useState<string | null>(null);
  
  const [visibleFilters, setVisibleFilters] = useState<Set<string>>(new Set());
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const addFilterButtonRef = useRef<HTMLDivElement>(null);
  const prevActiveSegmentId = useRef(activeSegmentId);

  const filterTypes = useMemo(() => [
    { id: 'priority', name: 'Priority' },
    { id: 'assignee', name: 'Assignee' },
    ...(statuses && setStatusFilter ? [{ id: 'status', name: 'Status' }] : []),
    { id: 'tag', name: 'Tag' },
    { id: 'sprint', name: 'Sprint' },
    { id: 'date', name: 'Date Range' },
  ], [statuses, setStatusFilter]);

  useEffect(() => {
    const segmentIdChanged = prevActiveSegmentId.current !== activeSegmentId;
    prevActiveSegmentId.current = activeSegmentId;

    // Only clear visible filters when the user explicitly switches to the "All Tasks" view.
    if (segmentIdChanged && activeSegmentId === 'all') {
        setVisibleFilters(new Set());
        return;
    }

    // If a segment is active (either on load or by switching), set its visible filters.
    // This will also run if the segment data changes, keeping the view in sync.
    if (activeSegmentId && activeSegmentId !== 'all') {
        const segment = segments.find(s => s.id === activeSegmentId);
        if (segment) {
            const newVisible = new Set<string>();
            const { filters } = segment;
            if (filters.priorityFilter?.length > 0) newVisible.add('priority');
            if (filters.assigneeFilter?.length > 0) newVisible.add('assignee');
            if (filters.statusFilter?.length > 0) newVisible.add('status');
            if (filters.tagFilter?.length > 0) newVisible.add('tag');
            if (filters.sprintFilter?.length > 0) newVisible.add('sprint');
            if (filters.startDate || filters.endDate) newVisible.add('date');
            setVisibleFilters(newVisible);
        }
    }
    // If the activeSegmentId has not changed and it's 'all', we do nothing.
    // This is the key fix that prevents manually added filters from being wiped out
    // by a background prop update.
  }, [activeSegmentId, segments]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (isAddFilterOpen && addFilterButtonRef.current && !addFilterButtonRef.current.contains(event.target as Node)) {
            setIsAddFilterOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddFilterOpen]);

  const addFilter = (type: string) => {
    setVisibleFilters(prev => new Set(prev).add(type));
    setIsAddFilterOpen(false);
  };

  const removeFilter = (type: string) => {
    setVisibleFilters(prev => {
        const next = new Set(prev);
        next.delete(type);
        return next;
    });
    // Reset the corresponding filter value
    if (type === 'priority') setPriorityFilter([]);
    if (type === 'assignee') setAssigneeFilter([]);
    if (type === 'status' && setStatusFilter) setStatusFilter([]);
    if (type === 'tag') setTagFilter([]);
    if (type === 'sprint') setSprintFilter([]);
    if (type === 'date') {
        setStartDate('');
        setEndDate('');
    }
  };

  const currentFilters = useMemo(() => ({
      searchTerm, priorityFilter, assigneeFilter, statusFilter: statusFilter || [],
      tagFilter, sprintFilter, startDate, endDate
  }), [searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate]);

  const hasActiveFilters = Object.values(currentFilters).some(v => (Array.isArray(v) ? v.length > 0 : v !== ''));

  const activeSegment = segments.find(s => s.id === activeSegmentId);
  
  const filtersHaveChanged = useMemo(() => {
    if (!activeSegment) return hasActiveFilters;

    const sortArrayValues = (obj: any) => {
        const newObj: any = {};
        for (const key in obj) {
            if (Array.isArray(obj[key])) {
                newObj[key] = [...obj[key]].sort();
            } else {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    };

    const sortedCurrent = sortArrayValues(currentFilters);
    const sortedSegment = sortArrayValues({
        ...activeSegment.filters,
        // Ensure all filter arrays exist to prevent errors
        priorityFilter: activeSegment.filters.priorityFilter || [],
        assigneeFilter: activeSegment.filters.assigneeFilter || [],
        statusFilter: activeSegment.filters.statusFilter || [],
        tagFilter: activeSegment.filters.tagFilter || [],
        sprintFilter: activeSegment.filters.sprintFilter || [],
    });

    return JSON.stringify(sortedCurrent) !== JSON.stringify(sortedSegment);
  }, [activeSegment, currentFilters, hasActiveFilters]);

  useEffect(() => {
    // This effect handles detaching from the "All Tasks" view when a filter is applied.
    // When filters are modified for a specific named view, we want to keep that view active
    // to allow the user to update it.
    if (activeSegmentId === 'all') {
      const hasAnyFilter =
        searchTerm ||
        priorityFilter.length > 0 ||
        assigneeFilter.length > 0 ||
        (statusFilter && statusFilter.length > 0) ||
        tagFilter.length > 0 ||
        sprintFilter.length > 0 ||
        startDate ||
        endDate;

      if (hasAnyFilter) {
        onApplySegment(null);
      }
    }
  }, [
    activeSegmentId,
    searchTerm,
    priorityFilter,
    assigneeFilter,
    statusFilter,
    tagFilter,
    sprintFilter,
    startDate,
    endDate,
    onApplySegment,
  ]);
  
  const handleDelete = (segmentId: string, segmentName: string) => {
    requestConfirmation({
      title: 'Delete View',
      message: <>Are you sure you want to delete the view <strong>"{segmentName}"</strong>?</>,
      onConfirm: () => onDeleteSegment(segmentId),
      confirmText: 'Delete',
    });
  };

  const handleRename = (segment: FilterSegment) => {
    setEditingSegmentId(segment.id);
    setEditingName(segment.name);
  };
  
  const handleSaveRename = (segmentId: string) => {
    if (editingName.trim()) {
        onUpdateSegment(segmentId, { name: editingName.trim() });
    }
    setEditingSegmentId(null);
  };
  
  const handleShare = (segmentId: string) => {
    const url = `${window.location.origin}/#/projects/${projectId}?view=${segmentId}`;
    navigator.clipboard.writeText(url);
    setCopiedViewId(segmentId);
    setTimeout(() => setCopiedViewId(null), 2000);
  };

  const availableFilters = filterTypes.filter(ft => !visibleFilters.has(ft.id));

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Views</h4>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => onApplySegment('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${activeSegmentId === 'all' ? 'bg-gray-300 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
          >
            All Tasks
          </button>
          {segments.map(segment => (
            <div key={segment.id} className="relative group flex-shrink-0">
                {editingSegmentId === segment.id ? (
                     <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onBlur={() => handleSaveRename(segment.id)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveRename(segment.id)}
                            className="bg-gray-900 text-white px-2 py-1 rounded text-xs"
                            autoFocus
                        />
                     </div>
                ) : (
                    <button
                        onClick={() => onApplySegment(segment.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors pr-8 ${activeSegmentId === segment.id ? 'bg-gray-300 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    >
                        {segment.name}
                        {activeSegmentId === segment.id && filtersHaveChanged && <span className="ml-1.5 text-inherit opacity-70">*</span>}
                    </button>
                )}
                {copiedViewId === segment.id && <CheckIcon className="absolute top-1/2 right-8 -translate-y-1/2 w-4 h-4 text-green-500" />}
                <ViewMenu 
                    segment={segment}
                    isCreator={segment.creatorId === currentUser.id}
                    onRename={() => handleRename(segment)}
                    onDelete={() => handleDelete(segment.id, segment.name)}
                    onShare={() => handleShare(segment.id)}
                />
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
            className="pl-10 pr-4 py-2 w-48 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs"
          />
        </div>
        
        {visibleFilters.has('priority') && (
            <MultiSelectFilter
                label="Priority"
                options={Object.values(TaskPriority).map(p => ({ value: p, label: p }))}
                selectedValues={priorityFilter}
                onChange={setPriorityFilter}
                onRemove={() => removeFilter('priority')}
            />
        )}
        {visibleFilters.has('assignee') && (
            <MultiSelectFilter
                label="Assignee"
                options={assignees.map(a => ({ value: a, label: a }))}
                selectedValues={assigneeFilter}
                onChange={setAssigneeFilter}
                onRemove={() => removeFilter('assignee')}
            />
        )}
        {visibleFilters.has('status') && statuses && setStatusFilter && (
            <MultiSelectFilter
                label="Status"
                options={statuses.map(s => ({ value: s, label: s }))}
                selectedValues={statusFilter || []}
                onChange={setStatusFilter}
                onRemove={() => removeFilter('status')}
            />
        )}
        {visibleFilters.has('tag') && (
            <MultiSelectFilter
                label="Tag"
                options={tags.map(t => ({ value: t, label: t }))}
                selectedValues={tagFilter}
                onChange={setTagFilter}
                onRemove={() => removeFilter('tag')}
            />
        )}
        {visibleFilters.has('sprint') && (
            <MultiSelectFilter
                label="Sprint"
                options={sprints.map(s => ({ value: s.id, label: s.name }))}
                selectedValues={sprintFilter}
                onChange={setSprintFilter}
                onRemove={() => removeFilter('sprint')}
            />
        )}
        {visibleFilters.has('date') && (
            <div className="flex items-center gap-2 bg-[#131C1B] border border-gray-800 rounded-lg pl-3">
                <label className="text-xs font-semibold text-gray-400">From:</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-white focus:outline-none text-xs py-2"/>
                <label className="text-xs font-semibold text-gray-400">To:</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-white focus:outline-none text-xs py-2"/>
                <button onClick={() => removeFilter('date')} className="p-2 text-gray-500 hover:text-white self-stretch hover:bg-gray-700/50 rounded-r-md"><XIcon className="w-4 h-4"/></button>
            </div>
        )}
        
        {availableFilters.length > 0 && (
          <div className="relative" ref={addFilterButtonRef}>
              <button onClick={() => setIsAddFilterOpen(prev => !prev)} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-gray-800 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-700 text-white">
                  <PlusIcon className="w-4 h-4"/> Add Filter
              </button>
              {isAddFilterOpen && (
                  <div className="absolute top-full left-0 mt-2 w-40 bg-[#131C1B] border border-gray-700 rounded-md shadow-lg z-10 py-1">
                      {availableFilters.map(filter => (
                          <button key={filter.id} onClick={() => addFilter(filter.id)} className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-gray-800">
                              {filter.name}
                          </button>
                      ))}
                  </div>
              )}
          </div>
        )}

        {hasActiveFilters && (<button onClick={onClearFilters} className="px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 rounded-lg">Clear Filters</button>)}
        
        {hasActiveFilters && (
            <>
                {activeSegmentId && activeSegmentId !== 'all' && filtersHaveChanged ? (
                    <button onClick={() => onUpdateSegment(activeSegmentId, { filters: currentFilters })} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-gray-300 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-400 text-black">
                        <SaveIcon className="w-4 h-4" /> Update view
                    </button>
                ) : (
                    <button onClick={() => setSaveModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-gray-800 border border-gray-700 rounded-lg shadow-sm hover:bg-gray-700 text-white">
                        <BookmarkPlusIcon className="w-4 h-4" /> Save as View
                    </button>
                )}
            </>
        )}
      </div>

      <SaveViewModal
        isOpen={isSaveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={async (name: string) => {
            await onAddSegment(name, currentFilters);
            setSaveModalOpen(false);
        }}
      />
    </div>
  );
};