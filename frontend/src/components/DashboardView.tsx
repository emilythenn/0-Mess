import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Search, Plus, ArrowRight, Lock, Users, HelpCircle, FileText, CheckCircle, ArrowLeft, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = () => {
  const { groups, createGroup, joinGroupRequest, setActiveGroupId, currentUser, dbError, pendingActionsCount } = useProject();
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create group modal/form state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newGroupId, setNewGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');
  const [newGroupPass, setNewGroupPass] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuggestions, setCreateSuggestions] = useState<string[]>([]);
  
  // Join group state
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [joinGroupId, setJoinGroupId] = useState<string>('');
  const [joinGroupPass, setJoinGroupPass] = useState<string>('');
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordRequired, setPasswordRequired] = useState<boolean>(false);

  // Filter groups by query
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupId.trim() || !newGroupName.trim() || !newGroupDesc.trim()) return;
    setCreateError(null);
    setCreateSuggestions([]);

    try {
      await createGroup(newGroupId, newGroupName, newGroupDesc, newGroupPass);
      // Reset state
      setNewGroupId('');
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupPass('');
      setShowCreateModal(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create group.');
      if (err.suggestions) {
        setCreateSuggestions(err.suggestions);
      }
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinGroupId.trim()) return;
    try {
      const res = await joinGroupRequest(joinGroupId, passwordRequired ? joinGroupPass : undefined);
      if (res.success) {
        if (res.passwordRequired) {
          setPasswordRequired(true);
          setJoinMessage(null); // Clear previous errors
        } else {
          setJoinMessage({ type: 'success', text: res.message || 'Joined group successfully!' });
          setTimeout(() => {
            setJoinMessage(null);
            setJoinGroupId('');
            setJoinGroupPass('');
            setPasswordRequired(false);
            setShowJoinModal(false);
          }, 3000);
        }
      } else {
        setJoinMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setJoinMessage({ type: 'error', text: err.message || 'Failed to join group.' });
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full select-none font-sans min-h-screen">
      
      {/* Offline/Sync Status Banner */}
      {pendingActionsCount > 0 && (
        <div className={`border rounded-xl p-3.5 flex items-center justify-between text-xs font-medium mb-4 animate-fade-in shrink-0 ${
          navigator.onLine 
            ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-2.5">
            {navigator.onLine ? (
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {navigator.onLine ? 'Synchronizing Updates: ' : 'Offline Mode: '}
              </span>
              <span>
                {navigator.onLine 
                  ? `Merging ${pendingActionsCount} queued update${pendingActionsCount === 1 ? '' : 's'} with Supabase server...`
                  : `${pendingActionsCount} update${pendingActionsCount === 1 ? '' : 's'} queued to sync. Changes will save automatically when online.`
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top-Level Database Error connection/warning banner */}
      {dbError && !dbError.includes('Offline Mode') && !dbError.includes('Synchronizing') && !dbError.includes('connection issue') && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-rose-900 font-medium mb-8 animate-fade-in shrink-0">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Cloud Sync Suspended: </span>
              <span>Database tables missing. Local Storage caching is active. Run </span>
              <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-[10px] text-rose-800">backend/supabase_schema.sql</code>
              <span> in Supabase SQL editor to enable database replication sync.</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">Active Workspaces</h1>
          <p className="text-[#666666] text-xs">Select your course teamwork group or enroll in a new assignment.</p>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center space-x-2 shrink-0">
          <button 
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="cursor-pointer border border-[#E5E7EB] bg-white hover:bg-[#FAFAFA] text-[#111111] font-semibold text-xs px-3.5 py-2.5 rounded-lg transition-all"
          >
            Join Group Code
          </button>
          
          <button 
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="cursor-pointer bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs px-3.5 py-2.5 rounded-lg transition-all flex items-center space-x-1 shadow-xs shadow-indigo-505/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {/* Modern Search bar */}
      <div className="relative mb-8 max-w-md w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888] w-4 h-4" />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search groups, courses, or IDs..."
          className="w-full bg-white border border-[#E5E7EB] py-2.5 pl-9 pr-4 rounded-xl text-xs placeholder:text-[#999999] focus:outline-hidden focus:border-[#4F46E5] focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
        />
      </div>

      {/* Course Group Cards Listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5">
        {filteredGroups.map((group) => {
          const isOwner = group.ownerId === currentUser.id;
          return (
            <div 
              key={group.id} 
              onClick={() => setActiveGroupId(group.id)}
              className="group cursor-pointer bg-white border border-[#E5E7EB] hover:border-[#4F46E5]/40 rounded-2xl p-5.5 hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between min-h-[170px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#999999] bg-[#FAFAFA] px-2 py-0.5 border border-[#E5E7EB] rounded font-semibold">
                    ID: {group.id}
                  </span>
                  {group.password && (
                    <span className="text-[10px] text-[#A0A0A0] flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Code protected</span>
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-[#111111] group-hover:text-[#4F46E5] transition-colors leading-tight">
                  {group.name}
                </h3>
                <p className="text-[#666666] text-xs mt-1.5 leading-relaxed truncate-2-lines">
                  {group.description}
                </p>
              </div>

              <div className="border-t border-[#F3F4F6] pt-4 mt-4.5 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[#888888] text-[11px] font-semibold">
                  <Users className="w-3.5 h-3.5" />
                  <span>{group.memberIds.length} enrolled student{group.memberIds.length === 1 ? '' : 's'}</span>
                </div>
                <span className="text-xs font-semibold text-[#4F46E5] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                  <span>Enter workgroup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div className="col-span-full bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-10 text-center text-[#666666]">
            <p className="text-sm font-semibold">No active workspaces matched.</p>
            <p className="text-xs text-[#999999] mt-1">Try another project search or click "Create Group" to start.</p>
          </div>
        )}
      </div>

      {/* CREATE MODAL DIALOG */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6.5 w-full max-w-md shadow-lg">
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#111111]">Create Academic Workspace</h2>
              <p className="text-[#666666] text-[11px] mt-0.5">Initialise synchronized file links, AI helper state, and Kanban boards.</p>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-150 rounded-xl text-xs mb-4">
                <p className="font-semibold">{createError}</p>
                {createSuggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-900 mb-1 text-[10px] uppercase font-mono font-bold">Suggested Available IDs:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {createSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setNewGroupId(suggestion)}
                          className="bg-white border border-red-200 text-red-850 hover:bg-red-50 px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Project / Assignment Name</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. CS402 Raft Consensus Core"
                  required
                  className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-2.5 text-xs text-[#111111] focus:outline-hidden focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Group ID</label>
                <input 
                  type="text" 
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  placeholder="e.g. CS402-G4"
                  required
                  className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-2.5 text-xs text-[#111111] focus:outline-hidden focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Brief Description</label>
                <textarea 
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Drafting state replication algorithms and synchronization files."
                  required
                  rows={2}
                  className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-2.5 text-xs text-[#111111] focus:outline-hidden focus:border-[#4F46E5] resize-none"
                />
              </div>

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Group Password (Optional)</label>
                <input 
                  type="text" 
                  value={newGroupPass}
                  onChange={(e) => setNewGroupPass(e.target.value)}
                  placeholder="e.g. raft"
                  className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-2.5 text-xs text-[#111111] focus:outline-hidden focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowCreateModal(false); setCreateError(null); setCreateSuggestions([]); }}
                  className="cursor-pointer flex-1 border border-[#E5E7EB] hover:bg-[#FAFAFA] text-[#111111] py-2 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="cursor-pointer flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2 text-xs font-semibold rounded-lg"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN CODE MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-xs select-none">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6.5 w-full max-w-md shadow-lg">
            <div className="mb-4">
              <h2 className="text-base font-bold text-[#111111]">Join Working Group</h2>
              <p className="text-[#666666] text-[11px] mt-0.5">Enter the credentials shared by your student teammate.</p>
            </div>

            {joinMessage && (
              <div className={`p-3 rounded-lg text-xs mb-3 ${joinMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' : 'bg-red-50 text-red-800 border border-red-150'}`}>
                {joinMessage.text}
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Group ID</label>
                <input 
                  type="text" 
                  value={joinGroupId}
                  onChange={(e) => setJoinGroupId(e.target.value)}
                  placeholder="e.g. CS415-G2"
                  required
                  disabled={passwordRequired}
                  className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-2.5 text-xs text-[#111111] focus:outline-hidden focus:border-[#4F46E5] disabled:opacity-60"
                />
              </div>

              {passwordRequired && (
                <div className="animate-fade-in">
                  <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Group Password</label>
                  <input 
                    type="password" 
                    value={joinGroupPass}
                    onChange={(e) => setJoinGroupPass(e.target.value)}
                    placeholder="e.g. cloud"
                    required
                    className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-2.5 text-xs text-[#111111] focus:outline-hidden focus:border-[#4F46E5]"
                  />
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setShowJoinModal(false); setJoinMessage(null); setJoinGroupId(''); setJoinGroupPass(''); setPasswordRequired(false); }}
                  className="cursor-pointer flex-1 border border-[#E5E7EB] hover:bg-[#FAFAFA] text-[#111111] py-2 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="cursor-pointer flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white py-2 text-xs font-semibold rounded-lg"
                >
                  {passwordRequired ? "Verify Password & Join" : "Check Group ID"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
