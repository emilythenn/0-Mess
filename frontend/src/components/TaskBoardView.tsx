import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { Plus, Check, ChevronLeft, ChevronRight, Calendar, Tag, Trash2, X, AlertOctagon } from 'lucide-react';

export const TaskBoardView: React.FC = () => {
  const { tasks, members, addTask, updateTaskStatus, deleteTask } = useProject();

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  
  // Create New Task Form states
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newAssignees, setNewAssignees] = useState<string[]>([]);
  const [newDueDate, setNewDueDate] = useState<string>('2026-06-01');
  const [newTags, setNewTags] = useState<string>('');

  const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle,
      description: newDesc,
      status: 'NOT_STARTED',
      priority: newPriority,
      assignees: newAssignees,
      dueDate: newDueDate,
      tags: newTags ? newTags.split(',').map(tag => tag.trim()) : [],
    });

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewPriority('MEDIUM');
    setNewAssignees([]);
    setNewDueDate('2026-06-01');
    setNewTags('');
    setShowCreateModal(false);
  };

  const toggleAssigneeSelection = (id: string) => {
    setNewAssignees(prev => 
      prev.includes(id) 
        ? prev.filter(memberId => memberId !== id) 
        : [...prev, id]
    );
  };

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-50 text-red-700 border border-red-200';
      case 'HIGH': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'MEDIUM': return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'NOT_STARTED', label: 'Not Started', color: 'bg-slate-100 text-slate-700 border-t-slate-400' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-indigo-50/70 text-indigo-800 border-t-indigo-500' },
    { id: 'COMPLETED', label: 'Completed', color: 'bg-emerald-50/70 text-emerald-800 border-t-emerald-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 select-none font-sans bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-4">
        <div>
          <span className="text-[10px] bg-slate-200/60 text-slate-600 font-bold px-2.5 py-1 rounded-full border border-slate-300/20 font-mono">
            SPRINT MILESTONE 1 MAPPING
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">Group Task Board</h1>
          <p className="text-slate-500 text-sm mt-0.5">Organize workloads, assign tasks, and monitor deadlines securely.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="cursor-pointer bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center space-x-1.5 scale-100 active:scale-98"
        >
          <Plus className="w-5 h-5 text-white" />
          <span>Add Sprint Card</span>
        </button>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div 
              key={col.id} 
              className="bg-white/80 rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col min-h-[500px]"
            >
              {/* Column Header Title */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${col.id === 'NOT_STARTED' ? 'bg-slate-400' : col.id === 'IN_PROGRESS' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                  <span className="font-extrabold text-slate-800 text-sm">{col.label}</span>
                </div>
                <span className="bg-slate-100 text-slate-600 font-bold font-mono text-xs px-2.5 py-0.5 rounded-full border border-slate-200">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Cards Lists */}
              <div className="space-y-4 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 font-medium">
                    No tasks here
                  </div>
                ) : (
                  colTasks.map((task) => {
                    return (
                      <div 
                        key={task.id} 
                        className="bg-white rounded-xl border border-slate-250 p-4 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all text-left flex flex-col justify-between whitespace-normal"
                      >
                        {/* Task Priority & Delete Button */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono uppercase tracking-wide ${getPriorityStyle(task.priority)}`}>
                            {task.priority}
                          </span>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="cursor-pointer text-slate-400 hover:text-red-500 p-1 rounded-sm hover:bg-slate-50 transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-snug">{task.title}</h4>
                          <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
                        </div>

                        {/* Tags */}
                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {task.tags.map(tag => (
                              <span key={tag} className="bg-slate-50 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-250/20 flex items-center space-x-0.5">
                                <Tag className="w-3 h-3 text-slate-400" />
                                <span>{tag}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Divider Line */}
                        <div className="border-t border-slate-100 my-3" />

                        {/* Assignee Avatars & Interactive Column Shifts */}
                        <div className="flex items-center justify-between">
                          {/* Avatars listing */}
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {task.assignees.length === 0 ? (
                              <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-dashed border-slate-200">
                                Unassigned
                              </span>
                            ) : (
                              task.assignees.map(mid => {
                                const m = members.find(member => member.id === mid);
                                return (
                                  <span 
                                    key={mid}
                                    title={m?.name}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white uppercase border border-white shrink-0 shadow-sm ${m?.color || 'bg-slate-550 bg-slate-400'}`}
                                  >
                                    {m?.avatar || 'ST'}
                                  </span>
                                );
                              })
                            )}
                          </div>

                          {/* Action column shifts (Simulates dragging with flawless UX) */}
                          <div className="flex items-center space-x-1">
                            {col.id !== 'NOT_STARTED' && (
                              <button
                                onClick={() => {
                                  const nextStatus = col.id === 'COMPLETED' ? 'IN_PROGRESS' : 'NOT_STARTED';
                                  updateTaskStatus(task.id, nextStatus as TaskStatus);
                                }}
                                className="cursor-pointer p-1 bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-md text-slate-500 hover:text-indigo-600 transition-colors"
                                title="Move Left"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            )}
                            
                            {col.id !== 'COMPLETED' && (
                              <button
                                onClick={() => {
                                  const nextStatus = col.id === 'NOT_STARTED' ? 'IN_PROGRESS' : 'COMPLETED';
                                  updateTaskStatus(task.id, nextStatus as TaskStatus);
                                }}
                                className="cursor-pointer p-1 bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-md text-slate-500 hover:text-indigo-600 transition-colors"
                                title="Move Right"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}

                            {col.id === 'COMPLETED' && (
                              <span className="bg-emerald-50 text-emerald-700 p-1 border border-emerald-200 rounded-md" title="Resolved Task">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Calendar Due Date footer notice */}
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono mt-2.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Expires {task.dueDate}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal to Register Sprint Card */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 py-6 px-7 w-full max-w-lg shadow-xl relative animate-scale-up max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="cursor-pointer absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Create Sprint Task Card</h3>
            <p className="text-slate-500 text-xs mt-0.5">Map structural workloads immediately and alert matched assignees.</p>

            <form onSubmit={handleCreateTask} className="mt-6 space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Integrate consensus state machines"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Core Scope Scope Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Summarize code targets, specific test files, or presentation contents."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Priority Label</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-930 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 id-select outline-hidden transition-all"
                  >
                    {priorities.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Assignee Choice List */}
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5 text-left">Delegate Workload (Select Assignees)</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {members.map(m => {
                    const selected = newAssignees.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAssigneeSelection(m.id)}
                        className={`cursor-pointer flex items-center justify-between p-2.5 border rounded-xl transition-all ${selected ? 'bg-indigo-50/50 border-indigo-400 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white uppercase ${m.color}`}>
                            {m.avatar}
                          </span>
                          <span className="truncate max-w-[100px] text-left font-semibold">{m.name}</span>
                        </div>
                        {selected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Tags (separated by commas)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. Backend, Raft Protocol, RocksDB"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-indigo-500/10"
                >
                  Enlist Task Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
