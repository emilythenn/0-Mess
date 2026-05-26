import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Commit } from '../types';
import { Activity, GitCommit, FileUp, Filter, Check, Paperclip, Calendar, BarChart, Sparkles, AlertCircle } from 'lucide-react';

export const CommitSystemView: React.FC = () => {
  const { commits, addCommit, members } = useProject();

  // Navigation / Filter states
  const [activeFilter, setActiveFilter] = useState<'all' | 'code' | 'docs' | 'research' | 'design' | 'testing'>('all');

  // New Commit form states
  const [commitTitle, setCommitTitle] = useState<string>('');
  const [commitDesc, setCommitDesc] = useState<string>('');
  const [commitType, setCommitType] = useState<Commit['type']>('code');
  
  // File upload simulation states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [chosenFile, setChosenFile] = useState<{ name: string; size: string; type: string } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setChosenFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || 'Custom File Document',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setChosenFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || 'Custom Source File',
      });
    }
  };

  const removeChosenFile = () => {
    setChosenFile(null);
  };

  // Preset file templates to assist easy simulation
  const handleSelectMockFilePreset = (presetName: string, type: string) => {
    setChosenFile({
      name: presetName,
      size: `${(Math.random() * 80 + 5).toFixed(1)} KB`,
      type: type,
    });
  };

  const handleSubmitCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitTitle.trim()) return;

    addCommit(
      commitTitle,
      commitDesc,
      commitType,
      chosenFile || undefined
    );

    // Reset Form
    setCommitTitle('');
    setCommitDesc('');
    setCommitType('code');
    setChosenFile(null);
  };

  // Filter commits
  const filteredCommits = commits.filter(c => activeFilter === 'all' || c.type === activeFilter);

  // Generate mock heatmap stats (GitHub contribution grid block format)
  // Grid of 53 weeks x 7 days styled statically to represent a beautiful, dense calendar heatmap of group activity
  const heatmapRows = 7;
  const heatmapWeeks = 28; // Reduced width for fitting nicely inside cards
  
  // Custom helper color intensities based on indexes
  const getShadeIntensity = (index: number) => {
    if (index % 11 === 0) return 'bg-indigo-600'; // High activity
    if (index % 5 === 0) return 'bg-indigo-400';  // Medium-high
    if (index % 3 === 0) return 'bg-indigo-200';  // Medium
    if (index % 2 === 0) return 'bg-indigo-100';  // Low activity
    return 'bg-slate-100';                         // No activity
  };

  const commitTypes: { id: Commit['type'] | 'all'; label: string }[] = [
    { id: 'all', label: 'All Sprints' },
    { id: 'code', label: 'Program Code' },
    { id: 'docs', label: 'Reports & Docs' },
    { id: 'design', label: 'Figma & Design' },
    { id: 'research', label: 'Lit Review' },
    { id: 'testing', label: 'Simulations' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 select-none font-sans bg-slate-50/50">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 font-mono">
          PROJECT CONTRIBUTION LOGS
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5 animate-fade-in-down">
          Teammate Progress & Contribution Logs
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Log assignment progress, project filings, and coursework milestones chronologically inside the group.
        </p>
      </div>

      {/* Academic style Contribution Matrix Grid Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div>
            <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span>Teammate Contribution Activity Map</span>
            </h3>
            <p className="text-xs text-slate-400">Regularity of logged work sessions across project semanas</p>
          </div>
          <span className="text-xs bg-slate-50 text-slate-600 font-bold px-3 py-1.5 rounded-full border border-slate-200/50 flex items-center space-x-1 font-mono">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Activity Multiplier: 94.2%</span>
          </span>
        </div>

        {/* Heatmap Layout with Week Columns */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex space-x-1 mt-4" style={{ minWidth: '400px' }}>
            {Array.from({ length: heatmapWeeks }).map((_, weekIdx) => (
              <div key={weekIdx} className="flex flex-col space-y-1">
                {Array.from({ length: heatmapRows }).map((_, rowIdx) => {
                  const daySeed = weekIdx * heatmapRows + rowIdx;
                  const shade = getShadeIntensity(daySeed);
                  return (
                    <span 
                      key={rowIdx} 
                      className={`w-3 h-3 rounded-sm ${shade} transition-all hover:ring-2 hover:ring-indigo-400 cursor-help duration-150`}
                      title={`Week ${weekIdx + 1}, Day ${rowIdx + 1}: progress verified`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end space-x-2.5 text-[10px] text-slate-400 mt-4.5 font-bold font-mono uppercase tracking-wider">
          <span>Less active</span>
          <span className="w-3 h-3 rounded-sm bg-slate-100" />
          <span className="w-3 h-3 rounded-sm bg-indigo-100" />
          <span className="w-3 h-3 rounded-sm bg-indigo-200" />
          <span className="w-3 h-3 rounded-sm bg-indigo-400" />
          <span className="w-3 h-3 rounded-sm bg-indigo-600" />
          <span>More Active Logs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        {/* Left Form Panel: Log Commit (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs h-fit">
          <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3.5 mb-5 flex items-center space-x-1.5">
            <GitCommit className="w-5 h-5 text-indigo-500" />
            <span>Publish Progress Log</span>
          </h3>

          <form onSubmit={handleSubmitCommit} className="space-y-4">
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Contribution Title / Summary</label>
              <input
                type="text"
                required
                value={commitTitle}
                onChange={(e) => setCommitTitle(e.target.value)}
                placeholder="e.g. Completed initial literature review draft"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Detailed Work Accomplished</label>
              <textarea
                value={commitDesc}
                onChange={(e) => setCommitDesc(e.target.value)}
                placeholder="Describe specific sections finished, problems solved, slides prepared, or files formatted."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Work Classification</label>
                <select
                  value={commitType}
                  onChange={(e) => setCommitType(e.target.value as Commit['type'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500"
                >
                  <option value="code">Software Dev & Code</option>
                  <option value="docs">Academic Reports & Written Work</option>
                  <option value="design">Figma Diagrams & Slide Decks</option>
                  <option value="testing">Testing / Project Validation</option>
                  <option value="research">Literature Research & References</option>
                </select>
              </div>
            </div>

            {/* Simulating File Attachments Drag-and-Drop */}
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Upload Assignment Proof File</label>
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-indigo-550 bg-indigo-50/50' 
                    : chosenFile 
                    ? 'border-emerald-300 bg-emerald-50/10' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                }`}
              >
                {/* Real hide input file picker file sync */}
                <input
                  type="file"
                  id="commit-file-picker"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {!chosenFile ? (
                  <div className="flex flex-col items-center">
                    <FileUp className="w-8 h-8 text-indigo-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-700">Drag & drop files here, or click to browse</span>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-wider">Supports React, Zip, PDFs, Figma drafts</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-100/50 text-emerald-800 rounded-xl border border-emerald-300/40">
                    <div className="flex items-center space-x-2 text-left min-w-0">
                      <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate leading-tight text-emerald-800">{chosenFile.name}</div>
                        <div className="text-[10px] text-emerald-600/85 font-mono leading-none mt-0.5">{chosenFile.size} • {chosenFile.type}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeChosenFile}
                      className="cursor-pointer text-xs text-slate-400 hover:text-red-500 font-bold p-1 hover:bg-slate-100 rounded-md transition-colors font-mono shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick prefilled academic attachment models for sandbox ease */}
            <div className="pt-2">
              <span className="block text-[11px] text-slate-400 font-mono uppercase mb-2">Sandbox attachment quick-pickers:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectMockFilePreset('RaftStateEngine.go', 'Go Lang Code File')}
                  className="cursor-pointer text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-1 rounded-md border border-indigo-200/50 transition-colors"
                >
                  RaftStateEngine.go
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMockFilePreset('Section3_Theory.pdf', 'Compacted PDF Document')}
                  className="cursor-pointer text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-1 rounded-md border border-indigo-200/50 transition-colors"
                >
                  Section3_Theory.pdf
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMockFilePreset('latency_chart.png', 'PNG Visual Diagram')}
                  className="cursor-pointer text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-1 rounded-md border border-indigo-200/50 transition-colors"
                >
                  latency_chart.png
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full bg-linear-to-r from-indigo-650 to-indigo-600 hover:from-indigo-700 hover:to-indigo-700 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md shadow-indigo-500/10 transition-colors flex items-center justify-center space-x-1.5 text-xs"
            >
              <GitCommit className="w-5 h-5" />
              <span>Publish Contribution Log</span>
            </button>
          </form>
        </div>

        {/* Right Timelines Board: Interactive Archive List with Filters (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Timeline Filter Controls */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center space-x-2 text-slate-500 text-xs mb-3 font-semibold">
              <Filter className="w-4 h-4" />
              <span>Filter Group Contribution Feed:</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {commitTypes.map(c => {
                const selected = activeFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveFilter(c.id)}
                    className={`cursor-pointer text-xs px-3 py-1.5 rounded-xl border font-bold transition-all ${
                      selected 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chronological Commit List */}
          <div className="space-y-4">
            {filteredCommits.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-sm text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No progress logs match the selected group filter</p>
              </div>
            ) : (
              filteredCommits.map((c) => {
                // Find author profile
                const author = members.find(m => m.id === c.memberId);
                const isCode = c.type === 'code';
                const isDocs = c.type === 'docs';
                const isTesting = c.type === 'testing';
                const isDesign = c.type === 'design';

                return (
                  <div 
                    key={c.id} 
                    className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-all text-left flex flex-col justify-between whitespace-normal"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left Block: member avatar + title info */}
                      <div className="flex space-x-3.5 items-start min-w-0">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 mt-0.5 ${author?.color || 'bg-slate-400'}`}>
                          {author?.avatar || 'ST'}
                        </span>
                        
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap text-xs">
                            <h4 className="font-extrabold text-slate-800 truncate">{c.authorName}</h4>
                            <span className="text-slate-400 font-mono">•</span>
                            <span className="text-slate-400 font-mono font-medium">{new Date(c.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>

                          <span className={`inline-block text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase mt-1.5 ${
                            isCode ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            isDocs ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            isTesting ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            isDesign ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' :
                            'bg-orange-50 text-orange-700 border border-orange-100'
                          }`}>
                            {c.type === 'code' ? 'Code Log' : c.type === 'docs' ? 'Report / Doc' : c.type === 'testing' ? 'Testing / Validation' : c.type === 'design' ? 'Design / Decks' : 'Research / Notes'}
                          </span>

                          <h3 className="font-bold text-slate-850 text-sm mt-3 leading-snug">{c.title}</h3>
                          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{c.description}</p>
                        </div>
                      </div>

                      {/* Right Block: lines of code added indicator */}
                      <div className="text-right shrink-0">
                        <span className="text-emerald-600 bg-emerald-50 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                          +{c.linesAdded} pts
                        </span>
                      </div>
                    </div>

                    {/* Attachment slot if available */}
                    {c.attachment && (
                      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate">{c.attachment.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase block">{c.attachment.type} • {c.attachment.size}</span>
                          </div>
                        </div>
                        <a 
                          href="#download" 
                          onClick={(e) => e.preventDefault()}
                          className="bg-white hover:bg-slate-100 text-slate-700 hover:text-indigo-650 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-205 border-slate-200 transition-colors"
                        >
                          View File
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
