

import React, { useState, FormEvent, DragEvent, useRef, useMemo, useEffect } from 'react';
import { Project, User, Bug, TaskPriority } from '../types';
import { LifeBuoyIcon, PlusIcon, FileUpIcon, LoaderCircleIcon, SparklesIcon, XIcon, TrashIcon, SearchIcon, DownloadIcon } from './Icons';
import { UserAvatar } from './UserAvatar';
import { ExportBugsModal } from './ExportBugsModal';
import { Pagination } from './Pagination';

// --- MODAL COMPONENTS ---

const CreateBugModal: React.FC<{
  onClose: () => void;
  onAddBug: (bugData: { title: string, description: string, priority: TaskPriority }) => void;
}> = ({ onClose, onAddBug }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddBug({ title, description, priority });
    onClose();
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
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg hover:bg-gray-400">Add Bug</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ImportBugsModal: React.FC<{
  onClose: () => void;
  onImport: (fileContent: string) => Promise<void>;
}> = ({ onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (file.type !== 'text/csv' && file.type !== 'text/plain') {
      setError('Please upload a valid .csv or .txt file.');
      return;
    }
    setIsLoading(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const content = event.target?.result as string;
            await onImport(content);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process file.');
        } finally {
            setIsLoading(false);
        }
    };
    reader.readAsText(file);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Import Bugs with AI</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800"><XIcon className="w-6 h-6" /></button>
        </header>
        <div className="p-6">
            <input type="file" ref={fileInputRef} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} accept=".csv,.txt" className="hidden" />
            <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${isDragging ? 'border-gray-500 bg-gray-800/50' : 'border-gray-700 hover:border-gray-600'}`}
            >
                {isLoading ? (
                    <div className="flex flex-col items-center"><LoaderCircleIcon className="w-10 h-10 animate-spin mb-3 text-white" /><p className="text-white">AI is parsing your file...</p></div>
                ) : (
                    <div className="flex flex-col items-center text-gray-400"><FileUpIcon className="w-10 h-10 mb-3" /><p className="font-semibold text-white">Drop a .csv or .txt file here</p><p>or click to upload</p></div>
                )}
            </div>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        </div>
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
  onAddBugsBatch: (fileContent: string) => Promise<void>;
  onDeleteBugsBatch: (bugIds: string[]) => Promise<void>;
}

const priorityStyles: Record<TaskPriority, string> = {
  [TaskPriority.URGENT]: 'bg-red-400 border-red-400',
  [TaskPriority.HIGH]: 'bg-yellow-400 border-yellow-400',
  [TaskPriority.MEDIUM]: 'bg-blue-400 border-blue-400',
  [TaskPriority.LOW]: 'bg-gray-400 border-gray-400',
};

const getStatusStyle = (status: string): string => {
    const lowerCaseStatus = status.toLowerCase();
    if (lowerCaseStatus.includes('done') || lowerCaseStatus.includes('resolved') || lowerCaseStatus.includes('closed')) {
        return 'bg-green-800 text-green-300';
    }
    if (lowerCaseStatus.includes('progress') || lowerCaseStatus.includes('review') || lowerCaseStatus.includes('testing')) {
        return 'bg-blue-800 text-blue-300';
    }
    return 'bg-gray-700 text-gray-300'; // Default for 'To Do', 'New', 'Backlog', etc.
};


export const BugReporter: React.FC<BugReporterProps> = ({ project, users, currentUser, onAddBug, onUpdateBug, onDeleteBug, onAddBugsBatch, onDeleteBugsBatch }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [selectedBugIds, setSelectedBugIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
  
  // Reset page when filters change
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

  const handleDeleteSelected = async () => {
    if (selectedBugIds.size === 0 || isDeleting) return;
    if (window.confirm(`Are you sure you want to delete ${selectedBugIds.size} selected bug(s)?`)) {
      setIsDeleting(true);
      try {
        await onDeleteBugsBatch(Array.from(selectedBugIds));
        setSelectedBugIds(new Set());
      } catch (error) {
        console.error("Failed to delete bugs:", error);
        alert(`Error: Could not delete the selected bugs. You may not have the required permissions.`);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleUpdate = (bugId: string, field: keyof Bug, value: any) => {
    const bug = filteredBugs.find(b => b.id === bugId);
    if (!bug) return;

    if (field === 'assignee') {
      const assignee = value ? projectMembers.find(m => m.id === value) : null;
      onUpdateBug(bugId, { assignee: assignee ?? undefined });
    } else {
      onUpdateBug(bugId, { [field]: value });
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
    <div className="bg-[#1C2326]/50 p-4 sm:p-6 rounded-lg">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><LifeBuoyIcon className="w-6 h-6"/> Bug Tracker</h3>
          {bugsExist && (
            <span className="text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
              Showing {filteredBugs.length} of {Object.keys(project.bugs || {}).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExportModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white font-semibold rounded-lg text-sm hover:bg-gray-700">
              <DownloadIcon className="w-5 h-5"/> Export
          </button>
          <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white font-semibold rounded-lg text-sm hover:bg-gray-700">
            <SparklesIcon className="w-5 h-5"/> Import with AI
          </button>
          <button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-300 text-black font-semibold rounded-lg text-sm hover:bg-gray-400">
            <PlusIcon className="w-5 h-5"/> Report Bug
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-[#1C2326] rounded-lg flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bugs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-48 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm">
            <option value="">All Statuses</option>
            {columnTitles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm">
            <option value="">All Priorities</option>
            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-3 py-2 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm">
            <option value="">All Assignees</option>
            {uniqueAssignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="flex items-center gap-2"><label className="text-sm text-gray-400">From:</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1.5 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"/></div>
          <div className="flex items-center gap-2"><label className="text-sm text-gray-400">To:</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1.5 border border-gray-800 rounded-lg bg-[#131C1B] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"/></div>
          {hasActiveFilters && (<button onClick={clearFilters} className="px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 rounded-lg">Clear Filters</button>)}
        </div>
        {selectedBugIds.size > 0 && (
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{selectedBugIds.size} selected</span>
                <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-3 py-2 bg-red-900/50 border border-red-500/50 text-red-400 font-semibold rounded-lg text-sm hover:bg-red-900/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDeleting ? <LoaderCircleIcon className="w-4 h-4 animate-spin" /> : <TrashIcon className="w-4 h-4" />}
                    {isDeleting ? 'Deleting...' : 'Delete Selected'}
                </button>
            </div>
        )}
      </div>

      <div className="bg-[#131C1B] rounded-lg shadow-md border border-gray-800 overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-[#1C2326]/50">
              <tr className="text-xs">
                  <th className="px-4 py-2 w-12">
                    <input type="checkbox" checked={isAllOnPageSelected} ref={input => { if (input) { const numSelectedOnPage = paginatedBugs.filter(b => selectedBugIds.has(b.id)).length; input.indeterminate = numSelectedOnPage > 0 && !isAllOnPageSelected; }}} onChange={handleSelectAll} className="w-4 h-4 rounded text-gray-500 bg-gray-700 border-gray-600 focus:ring-gray-500" aria-label="Select all bugs on page" />
                  </th>
                  <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider w-24">Bug ID</th>
                  <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider w-2/5">Bug</th>
                  <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider">Assignee</th>
                  <th className="px-4 py-3 font-semibold text-white uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {bugsExist && paginatedBugs.length > 0 ? paginatedBugs.map(bug => (
                <tr key={bug.id} className={`text-sm text-white ${selectedBugIds.has(bug.id) ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedBugIds.has(bug.id)} onChange={() => handleSelectOne(bug.id)} className="w-4 h-4 rounded text-gray-500 bg-gray-700 border-gray-600 focus:ring-gray-500" /></td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-400">{bug.bugNumber}</td>
                  <td className="px-4 py-3"><p className="font-semibold">{bug.title}</p><p className="text-xs text-gray-400 truncate max-w-xs" title={bug.description}>{bug.description}</p></td>
                  <td className="px-4 py-3"><select value={bug.status} onChange={e => handleUpdate(bug.id, 'status', e.target.value)} className={`text-xs font-semibold border-none rounded-full px-2 py-1 focus:ring-2 focus:ring-gray-500 ${getStatusStyle(bug.status)}`}>{columnTitles.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="px-4 py-3"><select value={bug.priority} onChange={e => handleUpdate(bug.id, 'priority', e.target.value)} className={`bg-transparent border text-xs font-semibold rounded-full px-2 py-1 focus:ring-2 focus:ring-gray-500 ${priorityStyles[bug.priority]}`}>{Object.values(TaskPriority).map(p => <option key={p} value={p} className="bg-[#1C2326] text-white font-normal">{p}</option>)}</select></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(bug.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><select value={bug.assignee?.id || ''} onChange={e => handleUpdate(bug.id, 'assignee', e.target.value)} className="w-full bg-[#1C2326] text-white text-sm border border-gray-800 focus:ring-2 focus:ring-gray-500 rounded-md px-2 py-1"><option value="">Unassigned</option>{projectMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => onDeleteBug(bug.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/50 rounded-full"><TrashIcon className="w-4 h-4" /></button></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    {hasActiveFilters ? "No bugs match your current filters." : "No bugs reported yet."}
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

      {isCreateModalOpen && <CreateBugModal onClose={() => setCreateModalOpen(false)} onAddBug={onAddBug} />}
      {isImportModalOpen && <ImportBugsModal onClose={() => setImportModalOpen(false)} onImport={onAddBugsBatch} />}
      {isExportModalOpen && <ExportBugsModal
          isOpen={isExportModalOpen}
          onClose={() => setExportModalOpen(false)}
          bugs={(Object.values(project.bugs || {}) as Bug[])}
          projectName={project.name}
          users={users}
      />}
    </div>
  );
};