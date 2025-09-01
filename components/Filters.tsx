
import React from 'react';
import { SearchIcon, FilterIcon } from './Icons';
import { TaskPriority } from '../types';

interface FiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (value: string) => void;
  assignees: string[];
}

export const Filters: React.FC<FiltersProps> = ({
  searchTerm,
  setSearchTerm,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  assignees,
}) => {

  const handleClearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setAssigneeFilter('');
  }

  const hasActiveFilters = searchTerm || priorityFilter || assigneeFilter;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-48 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value)}
        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Priorities</option>
        {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select
        value={assigneeFilter}
        onChange={(e) => setAssigneeFilter(e.target.value)}
        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Assignees</option>
        {assignees.map(a => <option key={a} value={a}>{a}</option>)}
      </select>

      {hasActiveFilters && (
        <button 
          onClick={handleClearFilters}
          className="px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};
