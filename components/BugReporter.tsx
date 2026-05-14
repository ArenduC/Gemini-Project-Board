
import React, { useState, FormEvent, DragEvent, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project, User, Bug, TaskPriority, BugResponse } from '../types';
import { LifeBuoyIcon, PlusIcon, FileUpIcon, LoaderCircleIcon, SparklesIcon, XIcon, TrashIcon, SearchIcon, DownloadIcon, BookmarkPlusIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { Pagination } from './Pagination';
import { Filters } from './Filters';
import { ExportBugsModal } from './ExportBugsModal';
import { useConfirmation } from '../App';
import { generateBugsFromFile } from '../services/geminiService';
import { exportBugsToCsv } from '../utils/export';
import { FilterSegment, Sprint } from '../types';

// --- HELPER COMPONENTS ---

const EditableField: React.FC<{
  value: string;
  onSave: (value: string) => void;
  isTextArea?: boolean;
  textClassName?: string;
  inputClassName?: string;
  placeholder?: string;
}> = ({ value, onSave, isTextArea = false, textClassName, inputClassName, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);
  
  const handleSave = () => {
    if (currentValue.trim() !== value.trim()) {
      onSave(currentValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTextArea) {
        e.preventDefault();
        handleSave();
    } else if (e.key === 'Escape') {
        setCurrentValue(value);
        setIsEditing(false);
    }
  };

  if (isEditing) {
    const commonProps = {
        value: currentValue,
        onChange: (e: any) => setCurrentValue(e.target.value),
        onBlur: handleSave,
        onKeyDown: handleKeyDown,
        className: `w-full bg-[#1C2326] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-md ${inputClassName}`,
        placeholder,
    };
    return isTextArea 
        ? <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} {...commonProps} rows={3} /> 
        : <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" {...commonProps} />;
  }
  return <div onClick={() => setIsEditing(true)} className={`cursor-pointer hover:bg-gray-800/50 rounded-md p-1 -m-1 transition-colors ${textClassName}`}>{value || <span className="text-gray-500">{placeholder || '...'}</span>}</div>;
};


// --- MODAL COMPONENTS ---

const CreateBugModal: React.FC<{
  onClose: () => void;
  onAddBug: (bugData: { title: string, description: string, priority: TaskPriority }) => Promise<void>;
}> = ({ onClose, onAddBug }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        setError('Please provide a title for the bug.');
        return;
    };
    setIsSaving(true);
    setError('');
    try {
        await onAddBug({ title, description, priority });
        onClose();
    } catch(err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Report a New Bug</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><XIcon className="w-6 h-6" /></button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Bug Title" required className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the bug..." rows={4} className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white" />
          <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full px-3 py-2 border border-gray-800 rounded-md bg-[#1C2326] text-white">
            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2">
                {isSaving && <LoaderCircleIcon className="w-5 h-5 animate-spin" />}
                {isSaving ? 'Adding...' : 'Add Bug'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const ImportBugsModal: React.FC<{
  onClose: () => void;
  onImport: (bugs: BugResponse[]) => Promise<void>;
}> = ({ onClose, onImport }) => {
  const [step, setStep] = useState<'upload' | 'selectHeaders'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileDetails, setFileDetails] = useState<{ content: string; headers: string[] } | null>(null);
  const [selectedHeaders, setSelectedHeaders] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    const isTxt = file.type === 'text/plain';

    if (!isCsv && !isTxt) {
      setError('Please upload a valid .csv or .txt file.');
      return;
    }

    setIsLoading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (isCsv) {
          const firstLine = content.split('\n')[0];
          const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
          setFileDetails({ content, headers });
          setSelectedHeaders(new Set()); 
          setStep('selectHeaders');
        } else { 
          const bugs = await generateBugsFromFile(content, []);
          await onImport(bugs);
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process file.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleHeaderToggle = (header: string) => {
    setSelectedHeaders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(header)) {
        newSet.delete(header);
      } else {
        newSet.add(header);
      }
      return newSet;
    });
  };

  const handleFinalImport = async () => {
    if (!fileDetails) return;
    setIsLoading(true);
    setError('');
    try {
      const bugs = await generateBugsFromFile(fileDetails.content, Array.from(selectedHeaders));
      await onImport(bugs); 
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI failed to parse the file.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Import Bugs with AI</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><XIcon className="w-6 h-6" /></button>
        </header>
        
        {step === 'upload' && (
          <div className="p-6">
            <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} accept=".csv,.txt" className="hidden" />
            <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${isLoading ? 'border-gray-600 bg-gray-800/30' : isDragging ? 'border-gray-500 bg-gray-800/50' : 'border-gray-700 hover:border-gray-600'}`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center text-gray-400"><LoaderCircleIcon className="w-10 h-10 animate-spin mb-3 text-white" /><p>Processing file...</p></div>
              ) : (
                <div className="flex flex-col items-center text-gray-400"><FileUpIcon className="w-10 h-10 mb-3" /><p className="font-semibold text-white">Drop a .csv or .txt file here</p><p>or click to upload</p></div>
              )}
            </div>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
          </div>
        )}
        
        {step === 'selectHeaders' && fileDetails && (
          <>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <h3 className="font-semibold text-white">Select columns to include</h3>
              <p className="text-xs text-gray-400">Choose which columns from your CSV to include in each bug's description.</p>
              <div className="space-y-2">
                {fileDetails.headers.map((header, index) => (
                  <label key={index} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-md cursor-pointer hover:bg-gray-800">
                    <input type="checkbox" checked={selectedHeaders.has(header)} onChange={() => handleHeaderToggle(header)} className="w-4 h-4 rounded text-gray-500 bg-gray-700 border-gray-600 focus:ring-gray-500" />
                    <span className="text-sm text-white">{header}</span>
                  </label>
                ))}
              </div>
               {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            </div>
            <footer className="p-4 bg-[#1C2326]/50 rounded-b-xl flex justify-end gap-3">
              <button onClick={() => setStep('upload')} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">Back</button>
              <button onClick={handleFinalImport} disabled={isLoading} className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2">
                {isLoading ? <LoaderCircleIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5"/>}
                {isLoading ? 'Parsing...' : 'Import Bugs'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};


// --- MAIN COMPONENT ---

interface BugReporterProps {
  project: Project;
  users: User[];
  currentUser: User;
  onAddBug: (bugData: { title: string, description: string, priority: TaskPriority }) => Promise<void>;
  onUpdateBug: (bugId: string, updates: Partial<Bug>) => Promise<void>;
  onDeleteBug: (bugId: string) => Promise<void>;
  onAddBugsBatch: (bugs: BugResponse[]) => Promise<void>;
  onDeleteBugsBatch: (bugIds: string[]) => Promise<void>;
  initialSearchTerm?: string;
  trigger?: { type: 'create' | 'import' | 'export' | null };
  aiFeaturesEnabled?: boolean;
  onTriggerComplete?: () => void;
  hideReportButton?: boolean;
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-red-500/10 text-red-400 border-red-500/20 font-bold',
  [TaskPriority.HIGH]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  [TaskPriority.MEDIUM]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [TaskPriority.LOW]: 'bg-white/5 text-gray-500 border-white/5',
};

const getStatusStyle = (status: string): string => {
    const lowerCaseStatus = (status || '').toLowerCase();
    if (lowerCaseStatus.includes('done') || lowerCaseStatus.includes('resolved') || lowerCaseStatus.includes('closed') || lowerCaseStatus.includes('complete')) {
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (lowerCaseStatus.includes('progress') || lowerCaseStatus.includes('review') || lowerCaseStatus.includes('testing')) {
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    return 'bg-white/5 text-gray-400 border-white/5'; 
};


export const BugReporter: React.FC<BugReporterProps> = ({ 
    project, users, currentUser, onAddBug, onUpdateBug, onDeleteBug, 
    onAddBugsBatch, onDeleteBugsBatch, initialSearchTerm = '', 
    trigger, aiFeaturesEnabled = false, onTriggerComplete,
    hideReportButton = false
}) => {
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [selectedBugIds, setSelectedBugIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [reporterFilter, setReporterFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sprintFilter, setSprintFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [relativeTimeValue, setRelativeTimeValue] = useState('');
  const [relativeTimeUnit, setRelativeTimeUnit] = useState<FilterSegment['filters']['relativeTimeUnit']>('hours');
  const [relativeTimeCondition, setRelativeTimeCondition] = useState<FilterSegment['filters']['relativeTimeCondition']>('within');
  const [segments, setSegments] = useState<FilterSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>('all');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const requestConfirmation = useConfirmation();
  const storageKey = `bugs-segments-${project.id}`;

  const projectMembers = useMemo(() => project.members.map(id => users.find(u => u.id === id)).filter((u): u is User => !!u), [project.members, users]);
  const columnTitles = useMemo(() => project.board.columnOrder.map(id => project.board.columns[id].title), [project.board]);
  
  const uniqueAssignees = useMemo(() => {
    const assignees = (Object.values(project.bugs || {}) as Bug[])
      .map(bug => bug.assignee)
      .filter((assignee): assignee is User => !!assignee);
    
    const unique = new Map<string, User>();
    assignees.forEach(assignee => {
      if (!unique.has(assignee.id)) {
        unique.set(assignee.id, assignee);
      }
    });
    return Array.from(unique.values());
  }, [project.bugs]);
  
  const uniqueReporters = useMemo(() => {
    const bugs = (Object.values(project.bugs || {}) as Bug[]);
    const reporterIds = Array.from(new Set(bugs.map(b => b.reporterId)));
    return reporterIds.map(id => users.find(u => u.id === id)).filter((u): u is User => !!u);
  }, [project.bugs, users]);

  const totalBugsInProject = useMemo(() => Object.keys(project.bugs || {}).length, [project.bugs]);

  const filteredBugs = useMemo(() => {
    let bugsToFilter = (project.bugOrder || []).map(id => project.bugs[id]).filter(Boolean);

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      bugsToFilter = bugsToFilter.filter(bug =>
        bug.title.toLowerCase().includes(lowercasedTerm) ||
        (bug.description && bug.description.toLowerCase().includes(lowercasedTerm)) ||
        (bug.bugNumber && bug.bugNumber.toLowerCase().includes(lowercasedTerm))
      );
    }
    if (statusFilter.length > 0) {
      bugsToFilter = bugsToFilter.filter(bug => statusFilter.includes(bug.status));
    }
    if (priorityFilter.length > 0) {
      bugsToFilter = bugsToFilter.filter(bug => priorityFilter.includes(bug.priority));
    }
    if (assigneeFilter.length > 0) {
      bugsToFilter = bugsToFilter.filter(bug => bug.assignee?.id ? assigneeFilter.includes(bug.assignee.id) : false);
    }
    if (reporterFilter.length > 0) {
      bugsToFilter = bugsToFilter.filter(bug => reporterFilter.includes(bug.reporterId));
    }
    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      bugsToFilter = bugsToFilter.filter(bug => new Date(bug.createdAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      bugsToFilter = bugsToFilter.filter(bug => new Date(bug.createdAt).getTime() <= end);
    }
    
    if (relativeTimeValue && parseInt(relativeTimeValue, 10) > 0) {
        const now = new Date();
        const cutoff = new Date();
        const value = parseInt(relativeTimeValue, 10);
        switch(relativeTimeUnit) {
            case 'seconds': cutoff.setSeconds(now.getSeconds() - value); break;
            case 'minutes': cutoff.setMinutes(now.getMinutes() - value); break;
            case 'hours': cutoff.setHours(now.getHours() - value); break;
            case 'days': cutoff.setDate(now.getDate() - value); break;
            case 'months': cutoff.setMonth(now.getMonth() - value); break;
            case 'years': cutoff.setFullYear(now.getFullYear() - value); break;
        }
        if (relativeTimeCondition === 'within') {
            bugsToFilter = bugsToFilter.filter(bug => new Date(bug.createdAt).getTime() >= cutoff.getTime());
        } else { 
            bugsToFilter = bugsToFilter.filter(bug => new Date(bug.createdAt).getTime() < cutoff.getTime());
        }
    }
    
    return bugsToFilter;
  }, [project.bugs, project.bugOrder, searchTerm, statusFilter, priorityFilter, assigneeFilter, reporterFilter, startDate, endDate, relativeTimeValue, relativeTimeUnit, relativeTimeCondition]);

  useEffect(() => {
    try {
      const savedSegments = localStorage.getItem(storageKey);
      if (savedSegments) {
        setSegments(JSON.parse(savedSegments));
      } else {
          setSegments([]);
      }
    } catch (error) {
      console.error("Failed to load bug filter segments", error);
    }
  }, [storageKey]);

  const saveSegmentsToStorage = (updatedSegments: FilterSegment[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedSegments));
    } catch (error) {
      console.error("Failed to save bug filter segments", error);
    }
  };

  const handleAddSegment = async (name: string, filters: FilterSegment['filters']) => {
    if (!name.trim()) return;
    const newSegment: FilterSegment = {
      id: Date.now().toString(),
      name: name.trim(),
      projectId: project.id,
      creatorId: currentUser.id,
      filters: filters,
    };
    const updatedSegments = [...segments, newSegment];
    setSegments(updatedSegments);
    saveSegmentsToStorage(updatedSegments);
    setActiveSegmentId(newSegment.id);
  };

  const handleDeleteSegment = async (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return;
    requestConfirmation({
        title: 'Delete Saved View',
        message: <>Are you sure you want to delete the saved view <strong>"{segment.name}"</strong>?</>,
        onConfirm: () => {
            const updatedSegments = segments.filter(s => s.id !== segmentId);
            setSegments(updatedSegments);
            saveSegmentsToStorage(updatedSegments);
            if (activeSegmentId === segmentId) {
                handleClearFilters();
            }
        },
        confirmText: 'Delete'
    });
  };

  const handleUpdateSegment = async (segmentId: string, updates: { name?: string, filters?: FilterSegment['filters'] }) => {
      const updatedSegments = segments.map(s => {
          if (s.id === segmentId) {
              return { ...s, name: updates.name ?? s.name, filters: updates.filters ?? s.filters };
          }
          return s;
      });
      setSegments(updatedSegments);
      saveSegmentsToStorage(updatedSegments);
  };

  const handleApplySegment = (segmentId: string | null) => {
    setActiveSegmentId(segmentId);
    if (segmentId === 'all' || segmentId === null) {
      setSearchTerm('');
      setPriorityFilter([]);
      setAssigneeFilter([]);
      setReporterFilter([]);
      setStatusFilter([]);
      setTagFilter([]);
      setSprintFilter([]);
      setStartDate('');
      setEndDate('');
      setRelativeTimeValue('');
      setRelativeTimeUnit('hours');
      setRelativeTimeCondition('within');
    } else {
      const segment = segments.find(s => s.id === segmentId);
      if (segment) {
        setSearchTerm(segment.filters.searchTerm || '');
        setPriorityFilter(segment.filters.priorityFilter || []);
        setAssigneeFilter(segment.filters.assigneeFilter || []);
        setReporterFilter(segment.filters.reporterFilter || []);
        setStatusFilter(segment.filters.statusFilter || []);
        setTagFilter(segment.filters.tagFilter || []);
        setSprintFilter(segment.filters.sprintFilter || []);
        setStartDate(segment.filters.startDate || '');
        setEndDate(segment.filters.endDate || '');
        setRelativeTimeValue(segment.filters.relativeTimeValue || '');
        setRelativeTimeUnit(segment.filters.relativeTimeUnit || 'hours');
        setRelativeTimeCondition(segment.filters.relativeTimeCondition || 'within');
      }
    }
  };

  const handleClearFilters = () => {
    handleApplySegment('all');
  };

  useEffect(() => {
    if (trigger?.type === 'create') setCreateModalOpen(true);
    if (trigger?.type === 'import' && aiFeaturesEnabled) setImportModalOpen(true);
    if (trigger?.type === 'export') {
      setExportModalOpen(true);
      if (onTriggerComplete) onTriggerComplete();
    }
  }, [trigger, aiFeaturesEnabled, onTriggerComplete]);

  useEffect(() => {
    setSearchTerm(initialSearchTerm || '');
  }, [initialSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredBugs.length]);

  const totalPages = Math.ceil(filteredBugs.length / ITEMS_PER_PAGE);
  const paginatedBugs = filteredBugs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const isAllOnPageSelected = useMemo(() => 
    paginatedBugs.length > 0 && paginatedBugs.every(b => selectedBugIds.has(b.id)),
    [paginatedBugs, selectedBugIds]
  );
  
  const handleSelectOne = (bugId: string) => {
    setSelectedBugIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(bugId)) {
        newSelected.delete(bugId);
      } else {
        newSelected.add(bugId);
      }
      return newSelected;
    });
  };
  
  const handleSelectAll = () => {
    const pageBugIds = new Set(paginatedBugs.map(b => b.id));
    setSelectedBugIds(prev => {
        const newSelected = new Set(prev);
        if (isAllOnPageSelected) {
            pageBugIds.forEach(id => newSelected.delete(id));
        } else {
            pageBugIds.forEach(id => newSelected.add(id));
        }
        return newSelected;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedBugIds.size === 0 || isDeleting) return;

    requestConfirmation({
      title: `Delete ${selectedBugIds.size} Bug(s)`,
      message: <>Are you sure you want to permanently delete {selectedBugIds.size} selected bug(s)? This action cannot be undone.</>,
      confirmText: 'Delete',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await onDeleteBugsBatch(Array.from(selectedBugIds));
          setSelectedBugIds(new Set());
        } catch (error) {
          console.error("Failed to delete bugs:", error);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleUpdate = (bugId: string, field: 'title' | 'description' | 'status' | 'priority' | 'assignee', value: any) => {
    const bug = filteredBugs.find(b => b.id === bugId);
    if (!bug) return;

    if (field === 'assignee') {
      const assignee = value ? projectMembers.find(m => m.id === value) : null;
      onUpdateBug(bugId, { assignee: assignee ?? undefined });
    } else {
      onUpdateBug(bugId, { [field]: value });
    }
  };
  
  const handleDeleteOne = (bug: Bug) => {
    requestConfirmation({
        title: "Delete Bug",
        message: <>Are you sure you want to delete the bug <strong>"{bug.title}"</strong>?</>,
        onConfirm: () => onDeleteBug(bug.id),
        confirmText: "Delete",
    });
  };

  const handleModalClose = () => {
    setCreateModalOpen(false);
    setImportModalOpen(false);
    if (onTriggerComplete) {
        onTriggerComplete();
    }
  };

  const hasActiveFilters = useMemo(() => {
      return (
          searchTerm !== '' ||
          priorityFilter.length > 0 ||
          assigneeFilter.length > 0 ||
          reporterFilter.length > 0 ||
          statusFilter.length > 0 ||
          tagFilter.length > 0 ||
          sprintFilter.length > 0 ||
          startDate !== '' ||
          endDate !== '' ||
          relativeTimeValue !== ''
      );
  }, [searchTerm, priorityFilter, assigneeFilter, statusFilter, tagFilter, sprintFilter, startDate, endDate, relativeTimeValue]);

  const bugsExist = Object.keys(project.bugs || {}).length > 0;

  return (
    <div className="space-y-2">
      <div className="relative z-30 flex items-center justify-between gap-3 p-1.5 bg-[#1C2326]/50 rounded-xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-1 border-r border-white/10 pr-2 overflow-x-auto no-scrollbar max-w-[40%] sm:max-w-[50%]">
          <button 
              onClick={() => handleApplySegment('all')} 
              className={`px-2.5 py-1 flex-shrink-0 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${activeSegmentId === 'all' ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
          >
              All
          </button>
          {segments.map(segment => (
              <div key={segment.id} className="relative group flex-shrink-0">
                  <button 
                      onClick={() => handleApplySegment(segment.id)} 
                      className={`pl-2.5 ${activeSegmentId === segment.id ? 'pr-6' : 'pr-2.5'} py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${activeSegmentId === segment.id ? 'bg-white text-black shadow-lg shadow-white/5' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                      {segment.name}
                  </button>
                  {activeSegmentId === segment.id && (
                      <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSegment(segment.id); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-black hover:text-red-600 transition-colors"
                      >
                          <XIcon className="w-2 h-2" />
                      </button>
                  )}
              </div>
          ))}
        </div>

        <div className="flex-grow min-w-[150px]">
          <Filters
              projectId={project.id}
              currentUser={currentUser}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              assigneeFilter={assigneeFilter}
              setAssigneeFilter={setAssigneeFilter}
              reporterFilter={reporterFilter}
              setReporterFilter={setReporterFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              sprintFilter={sprintFilter}
              setSprintFilter={setSprintFilter}
              sprints={project.sprints || []}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              relativeTimeValue={relativeTimeValue}
              setRelativeTimeValue={setRelativeTimeValue}
              relativeTimeUnit={relativeTimeUnit}
              setRelativeTimeUnit={setRelativeTimeUnit}
              relativeTimeCondition={relativeTimeCondition}
              setRelativeTimeCondition={setRelativeTimeCondition}
              assigneeOptions={uniqueAssignees.map(a => ({ value: a.id, label: a.name }))}
              reporterOptions={uniqueReporters.map(r => ({ value: r.id, label: r.name }))}
              statuses={columnTitles}
              tags={[]}
              segments={segments}
              activeSegmentId={activeSegmentId}
              onAddSegment={handleAddSegment}
              onUpdateSegment={handleUpdateSegment}
              onDeleteSegment={handleDeleteSegment}
              onApplySegment={handleApplySegment}
              onClearFilters={handleClearFilters}
              isCompact
            />
        </div>

        <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
            {selectedBugIds.size > 0 && (
                <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-lg text-[8px] uppercase hover:bg-red-500/20 transition-all h-7"
                >
                    {isDeleting ? <LoaderCircleIcon className="w-2.5 h-2.5 animate-spin" /> : <TrashIcon className="w-2.5 h-2.5" />}
                    Delete
                </button>
            )}
            {!hideReportButton && (
                <button
                    onClick={() => setCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white text-black font-bold rounded-lg text-[8px] uppercase hover:bg-gray-200 transition-all h-7 shadow-sm"
                >
                    <PlusIcon className="w-2.5 h-2.5" />
                    Report
                </button>
            )}
            {aiFeaturesEnabled && (
                <button
                    onClick={() => setImportModalOpen(true)}
                    className="flex items-center justify-center p-1 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all h-7 w-7"
                    title="Import with AI"
                >
                    <FileUpIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
      </div>

      <div className="bg-[#131C1B]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left min-w-[800px] table-fixed">
            <thead className="bg-white/5">
              <tr className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-500">
                  <th className="px-6 py-4 w-12 text-center">
                    <input type="checkbox" checked={isAllOnPageSelected} ref={input => { if (input) { const numSelectedOnPage = paginatedBugs.filter(b => selectedBugIds.has(b.id)).length; input.indeterminate = numSelectedOnPage > 0 && !isAllOnPageSelected; }}} onChange={handleSelectAll} className="w-3 h-3 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/50" />
                  </th>
                  <th className="px-6 py-4 w-20">ID</th>
                  <th className="px-6 py-4 w-auto">Details</th>
                  <th className="px-6 py-4 w-36 text-center">Status</th>
                  <th className="px-6 py-4 w-32 text-center">Priority</th>
                  <th className="px-6 py-4 w-24 text-center">Date</th>
                  <th className="px-6 py-4 w-44">Assignee</th>
                  <th className="px-4 py-4 text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bugsExist && paginatedBugs.length > 0 ? paginatedBugs.map(bug => (
                <tr key={bug.id} className={`text-[11px] text-white transition-all group ${selectedBugIds.has(bug.id) ? 'bg-white/10' : 'hover:bg-white/[0.03]'}`}>
                  <td className="px-6 py-4 text-center"><input type="checkbox" checked={selectedBugIds.has(bug.id)} onChange={() => handleSelectOne(bug.id)} className="w-3 h-3 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/50" /></td>
                  <td className="px-6 py-4 font-mono text-[#5865F2] font-black tracking-wider">#{bug.bugNumber}</td>
                  <td className="px-6 py-4 overflow-hidden">
                     <EditableField
                        value={bug.title}
                        onSave={(newTitle) => handleUpdate(bug.id, 'title', newTitle)}
                        textClassName="font-bold text-white truncate max-w-full block hover:text-emerald-400 group-hover:translate-x-1 transition-all"
                        inputClassName="px-2 py-1 text-[11px]"
                        placeholder="Bug Title"
                    />
                    <EditableField
                        value={bug.description}
                        onSave={(newDescription) => handleUpdate(bug.id, 'description', newDescription)}
                        isTextArea
                        textClassName="text-[9px] text-gray-500 truncate max-w-full block mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity"
                        inputClassName="px-2 py-1 text-[9px]"
                        placeholder="Description"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 w-full ${getStatusStyle(bug.status)}`}>
                        <select 
                            value={bug.status} 
                            onChange={e => handleUpdate(bug.id, 'status', e.target.value)} 
                            className="bg-transparent border-none text-[8px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full cursor-pointer appearance-none text-center"
                        >
                            {columnTitles.map(s => <option key={s} value={s} className="bg-[#131C1B]">{s}</option>)}
                        </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 w-full ${priorityStyles[bug.priority]}`}>
                        <select 
                            value={bug.priority} 
                            onChange={e => handleUpdate(bug.id, 'priority', e.target.value)} 
                            className="bg-transparent border-none text-[8px] font-black uppercase tracking-widest focus:ring-0 p-0 w-full cursor-pointer appearance-none text-center"
                        >
                            {Object.values(TaskPriority).map(p => <option key={p} value={p} className="bg-[#131C1B] text-white font-normal">{p}</option>)}
                        </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-500 font-mono text-[9px] tracking-tight">{new Date(bug.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 bg-white/5 rounded-md p-1 pr-3">
                        <UserAvatar user={bug.assignee} className="w-5 h-5 ring-1 ring-white/10 flex-shrink-0" />
                        <select 
                            value={bug.assignee?.id || ''} 
                            onChange={e => handleUpdate(bug.id, 'assignee', e.target.value)} 
                            className="bg-transparent border-none text-[9px] text-gray-400 hover:text-white focus:ring-0 p-0 w-full truncate leading-none cursor-pointer appearance-none"
                        >
                            <option value="" className="bg-[#131C1B]">Unassigned</option>
                            {projectMembers.map(m => <option key={m.id} value={m.id} className="bg-[#131C1B]">{m.name}</option>)}
                        </select>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right"><button onClick={() => handleDeleteOne(bug)} className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-3 h-3" /></button></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="text-center py-40 text-gray-700 font-mono text-[10px] italic uppercase tracking-[0.3em]">
                    {hasActiveFilters ? "ZERO RESULTS IN SECTOR" : "DATASET UNDEFINED"}
                  </td>
                </tr>
              )}
            </tbody>
        </table>
      </div>
      <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={filteredBugs.length}
      />

      {isCreateModalOpen && <CreateBugModal onClose={handleModalClose} onAddBug={onAddBug} />}
      {isImportModalOpen && <ImportBugsModal onClose={handleModalClose} onImport={onAddBugsBatch} />}
      <ExportBugsModal 
        isOpen={isExportModalOpen} 
        onClose={() => setExportModalOpen(false)} 
        bugs={filteredBugs} 
        projectName={project.name} 
        users={users.reduce((acc, user) => { acc[user.id] = user; return acc; }, {} as Record<string, User>)} 
      />
    </div>
  );
};
