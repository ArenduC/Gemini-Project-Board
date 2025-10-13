import { Project, User, AugmentedTask, Bug } from '../types';

// Helper to escape CSV fields
const escapeCsvField = (field: string | undefined | null): string => {
  if (field === null || field === undefined) {
    return '""';
  }
  const stringField = String(field);
  // If the field contains a comma, double quote, or newline, wrap it in double quotes
  if (/[",\n]/.test(stringField)) {
    // Also, double up any existing double quotes
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return `"${stringField}"`;
};

export const exportTasksToCsv = (projects: Project[], users: Record<string, User>) => {
  const headers = [
    'Project ID', 'Project Name', 'Task ID', 'Task Title', 'Task Description',
    'Status', 'Priority', 'Assignee ID', 'Assignee Name', 'Creator ID',
    'Creator Name', 'Created At'
  ];

  const rows = projects.flatMap(project => {
    const tasks = Object.values(project.board.tasks);
    return tasks.map(task => {
      const column = Object.values(project.board.columns).find(c => c.taskIds.includes(task.id));
      const creator = users[task.creatorId];
      const assignee = task.assignee ? users[task.assignee.id] : null;

      return [
        project.id,
        project.name,
        task.id,
        task.title,
        task.description,
        column?.title || 'Uncategorized',
        task.priority,
        assignee?.id || '',
        assignee?.name || 'Unassigned',
        creator?.id || '',
        creator?.name || 'Unknown',
        task.createdAt
      ].map(escapeCsvField).join(',');
    });
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'project_tasks_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportAugmentedTasksToCsv = (tasks: AugmentedTask[], users: Record<string, User>) => {
  const headers = [
    'Task ID', 'Task Title', 'Project Name', 'Status', 'Priority', 
    'Assignee Name', 'Creator Name', 'Created At', 'Task Description'
  ];

  const rows = tasks.map(task => {
      const creator = users[task.creatorId];
      const assignee = task.assignee ? users[task.assignee.id] : null;

      return [
        task.id,
        task.title,
        task.projectName,
        task.columnName,
        task.priority,
        assignee?.name || 'Unassigned',
        creator?.name || 'Unknown',
        task.createdAt,
        task.description
      ].map(escapeCsvField).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tasks_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportBugsToCsv = (bugs: Bug[], projectName: string, users: Record<string, User>) => {
  const headers = [
    'Bug ID', 'Project Name', 'Title', 'Description', 'Status', 'Priority', 
    'Assignee ID', 'Assignee Name', 'Reporter ID', 'Reporter Name', 'Created At'
  ];

  const rows = bugs.map(bug => {
    const assignee = bug.assignee ? users[bug.assignee.id] : null;
    const reporter = users[bug.reporterId];

    return [
      bug.id,
      projectName,
      bug.title,
      bug.description,
      bug.status,
      bug.priority,
      assignee?.id || '',
      assignee?.name || 'Unassigned',
      reporter?.id || '',
      reporter?.name || 'Unknown',
      bug.createdAt
    ].map(escapeCsvField).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `bug_export_${projectName.replace(/\s+/g, '_')}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
