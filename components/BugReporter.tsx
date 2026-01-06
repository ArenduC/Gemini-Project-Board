
import React, { useState, FormEvent, DragEvent, useRef, useMemo, useEffect } from 'react';
import { Project, User, Bug, TaskPriority, BugResponse } from '../types';
import { LifeBuoyIcon, PlusIcon, FileUpIcon, LoaderCircleIcon, SparklesIcon, XIcon, TrashIcon, SearchIcon, DownloadIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { ExportBugsModal } from './ExportBugsModal';
import { Pagination } from './Pagination';
import { useConfirmation } from '../App';
import { generateBugsFromFile } from '../services/geminiService';

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
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
    </div>
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
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
    </div>
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
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-red-400 border-red-400',
  [TaskPriority.HIGH]: 'bg-yellow-400 border-yellow-400',
  [TaskPriority.MEDIUM]: 'bg-blue-400 border-blue-400',
  [TaskPriority.LOW]: 'bg-gray-400 border-gray-400',
};

const getStatusStyle = (status: string): string => {
    const lowerCaseStatus = (status || '').toLowerCase();
    if (lowerCaseStatus.includes('done') || lowerCaseStatus.includes('resolved') || lowerCaseStatus.includes('closed')) {
        return 'bg-green-800 text-green-300';
    }
    if (lowerCaseStatus.includes('progress') || lowerCaseStatus.includes('review') || lowerCaseStatus.includes('testing')) {
        return 'bg-blue-800 text-blue-300';
    }
    return 'bg-gray-700 text-gray-300'; 
};


export const BugReporter: React.FC<BugReporterProps> = ({ project, users, currentUser, onAddBug, onUpdateBug, onDeleteBug, onAddBugsBatch, onDeleteBugsBatch, initialSearchTerm = '', trigger, aiFeaturesEnabled = false, onTriggerComplete }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [selectedBugIds, setSelectedBugIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const requestConfirmation = useConfirmation();

  useEffect(() => {
    if (trigger?.type === 'create') setCreateModalOpen(true);
    if (trigger?.type === 'import' && aiFeaturesEnabled) setImportModalOpen(true);
    if (trigger?.type === 'export') setExportModalOpen(true);
    // Logic: Do not call onTriggerComplete immediately if a modal is about to open, 
    // instead wait for the modal to close to avoid view jumping.
  }, [trigger, aiFeaturesEnabled]);

  const projectMembers = useMemo(() => project.members.map(id => users.find(u => u.id === id)).filter((u): u is User => !!u), [project.members, users]);
  const columnTitles = useMemo(() => project.board.columnOrder.map(id => project.board.columns[id].title), [project.board]);
  
  useEffect(() => {
    setSearchTerm(initialSearchTerm || '');
  }, [initialSearchTerm]);

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
    if (statusFilter) {
      bugsToFilter = bugsToFilter.filter(bug => bug.status === statusFilter);
    }
    if (priorityFilter) {
      bugsToFilter = bugsToFilter.filter(bug => bug.priority === priorityFilter);
    }
    if (assigneeFilter) {
      bugsToFilter = bugsToFilter.filter(bug => bug.assignee?.id === assigneeFilter);
    }
    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      bugsToFilter = bugsToFilter.filter(bug => new Date(bug.createdAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      bugsToFilter = bugsToFilter.filter(bug => new Date(bug.createdAt).getTime() <= end);
    }
    return bugsToFilter;
  }, [project.bugs, project.bugOrder, searchTerm, statusFilter, priorityFilter, assigneeFilter, startDate, endDate]);
  
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
    setExportModalOpen(false);
    if (onTriggerComplete) {
        onTriggerComplete();
    }
  };

  const hasActiveFilters = searchTerm || statusFilter || priorityFilter || assigneeFilter || startDate || endDate;
  const bugsExist = Object.keys(project.bugs || {}).length > 0;
  
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-[#1C2326] rounded-xl flex items-center justify-between gap-4 flex-wrap border border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5 mr-2">
            <span className="text-[10px] font-black text-gray-500 uppercase">Records:</span>
            <span className="text-[11px] font-bold text-white">{filteredBugs.length} / {totalBugsInProject}</span>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search bugs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-48 border border-white/5 rounded-xl bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[11px] h-10"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-white/5 rounded-xl bg-[#131C1B] text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[10px] font-bold uppercase h-10">
            <option value="">Status</option>
            {columnTitles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border border-white/5 rounded-xl bg-[#131C1B] text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[10px] font-bold uppercase h-10">
            <option value="">Priority</option>
            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-3 py-2 border border-white/5 rounded-xl bg-[#131C1B] text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[10px] font-bold uppercase h-10">
            <option value="">Assignee</option>
            {uniqueAssignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="flex items-center gap-2 px-3 h-10 bg-[#131C1B] border border-white/5 rounded-xl">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none focus:outline-none text-white text-[10px]"/>
          </div>
          <div className="flex items-center gap-2 px-3 h-10 bg-[#131C1B] border border-white/5 rounded-xl">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none focus:outline-none text-white text-[10px]"/>
          </div>
          {hasActiveFilters && (<button onClick={clearFilters} className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase hover:text-red-400 transition-colors">Reset</button>)}
        </div>
        {selectedBugIds.size > 0 && (
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{selectedBugIds.size} Selected</span>
                <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl text-[10px] uppercase hover:bg-red-500/20 transition-all h-10"
                >
                    {isDeleting ? <LoaderCircleIcon className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                    Delete
                </button>
            </div>
        )}
      </div>

      <div className="bg-[#131C1B]/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-white/5">
              <tr className="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-500">
                  <th className="px-6 py-4 w-12 text-center">
                    <input type="checkbox" checked={isAllOnPageSelected} ref={input => { if (input) { const numSelectedOnPage = paginatedBugs.filter(b => selectedBugIds.has(b.id)).length; input.indeterminate = numSelectedOnPage > 0 && !isAllOnPageSelected; }}} onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-emerald-500/50" />
                  </th>
                  <th className="px-4 py-4 w-24">ID</th>
                  <th className="px-4 py-4 w-2/5">Bug Details</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Priority</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Assignee</th>
                  <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bugsExist && paginatedBugs.length > 0 ? paginatedBugs.map(bug => (
                <tr key={bug.id} className={`text-xs text-white transition-all ${selectedBugIds.has(bug.id) ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}>
                  <td className="px-6 py-4 text-center"><input type="checkbox" checked={selectedBugIds.has(bug.id)} onChange={() => handleSelectOne(bug.id)} className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-emerald-500/50" /></td>
                  <td className="px-4 py-4 font-mono text-gray-500 text-[10px] font-bold">{bug.bugNumber}</td>
                  <td className="px-4 py-4 align-top">
                     <EditableField
                        value={bug.title}
                        onSave={(newTitle) => handleUpdate(bug.id, 'title', newTitle)}
                        textClassName="font-bold text-white text-[13px]"
                        inputClassName="px-2 py-1"
                        placeholder="Enter a title"
                    />
                    <EditableField
                        value={bug.description}
                        onSave={(newDescription) => handleUpdate(bug.id, 'description', newDescription)}
                        isTextArea
                        textClassName="text-[11px] text-gray-400 mt-1 whitespace-pre-wrap leading-relaxed line-clamp-2"
                        inputClassName="px-2 py-1 text-xs mt-1"
                        placeholder="Enter a description"
                    />
                  </td>
                  <td className="px-4 py-4"><select value={bug.status} onChange={e => handleUpdate(bug.id, 'status', e.target.value)} className={`text-[9px] font-black uppercase tracking-widest border-none rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500/50 ${getStatusStyle(bug.status)}`}>{columnTitles.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="px-4 py-4"><select value={bug.priority} onChange={e => handleUpdate(bug.id, 'priority', e.target.value)} className={`bg-transparent border text-[9px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500/50 ${priorityStyles[bug.priority]} bg-opacity-10 text-opacity-100`}>{Object.values(TaskPriority).map(p => <option key={p} value={p} className="bg-[#1C2326] text-white font-normal">{p}</option>)}</select></td>
                  <td className="px-4 py-4 text-gray-500 font-mono text-[10px]">{new Date(bug.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                        <UserAvatar user={bug.assignee} className="w-7 h-7 ring-1 ring-white/10" />
                        <select value={bug.assignee?.id || ''} onChange={e => handleUpdate(bug.id, 'assignee', e.target.value)} className="bg-transparent border-none text-[10px] text-gray-400 hover:text-white focus:ring-2 focus:ring-emerald-500/50 rounded-md py-1 max-w-[100px] truncate"><option value="">Unassigned</option>{projectMembers.map(m => <option key={m.id} value={m.id} className="bg-[#131C1B]">{m.name}</option>)}</select>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteOne(bug)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-gray-600 font-mono text-xs italic uppercase tracking-widest">
                    {hasActiveFilters ? "NO RESULTS IN SCOPE" : "BUG DATABASE EMPTY"}
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
      {isExportModalOpen && <ExportBugsModal
          isOpen={isExportModalOpen}
          onClose={handleModalClose}
          bugs={(Object.values(project.bugs || {}) as Bug[])}
          projectName={project.name}
          users={users}
      />}
    </div>
  );
};
