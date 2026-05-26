import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Event, MeetingPoll } from '../types';
import { Calendar, Users, Plus, Check, Trash2, X, Clock, HelpCircle, Save, Info } from 'lucide-react';

export const CalendarMeetingsView: React.FC = () => {
  const { events, polls, members, currentUser, votePollSlot, createMeetingPoll, addEvent } = useProject();

  // Selected date trigger for local filters
  const [selectedDay, setSelectedDay] = useState<number | null>(24);

  // Poll creation form triggers
  const [showPollForm, setShowPollForm] = useState<boolean>(false);
  const [pollTitle, setPollTitle] = useState<string>('');
  const [pollDesc, setPollDesc] = useState<string>('');
  const [pollSlots, setPollSlots] = useState<string[]>(['']);

  // Event creation form triggers
  const [showEventForm, setShowEventForm] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('2026-05-28 14:00');
  const [eventType, setEventType] = useState<Event['type']>('meeting');
  const [eventDesc, setEventDesc] = useState<string>('');

  // Handle Poll Submits
  const handleAddNewPoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle.trim()) return;

    // Filter empty options
    const filteredSlots = pollSlots.filter(s => s.trim() !== '');
    if (filteredSlots.length === 0) return;

    createMeetingPoll(pollTitle, pollDesc, filteredSlots);

    // Reset Form
    setPollTitle('');
    setPollDesc('');
    setPollSlots(['']);
    setShowPollForm(false);
  };

  const handleAddFieldSlot = () => {
    setPollSlots(prev => [...prev, '']);
  };

  const handleChangeSlotText = (index: number, val: string) => {
    setPollSlots(prev => prev.map((s, idx) => idx === index ? val : s));
  };

  // Handle Event submit
  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    addEvent(eventTitle, eventTime, eventType, eventDesc);

    // Reset Form
    setEventTitle('');
    setEventTime('2026-05-28 14:00');
    setEventType('meeting');
    setEventDesc('');
    setShowEventForm(false);
  };

  // Calendar parameters for May 2026
  // May 2026 starts on Friday, May 1. Total days: 31
  const daysInMay = 31;
  const startOffset = 5; // Friday offset (Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6)
  
  // Create grids representation
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMay; i++) {
    calendarCells.push(i);
  }

  // Check if a day has any events mapped
  // event format: "2026-05-28 14:00" -> retrieve day element 28!
  const getEventsForDay = (day: number) => {
    return events.filter(evt => {
      // Very simple string parsing for mock calendar date
      const dayStr = `0${day}`.slice(-2);
      return evt.time.includes(`2026-05-${dayStr}`) || evt.time.includes(`-05-${dayStr}`);
    });
  };

  const handleCellClick = (dayStr: number | null) => {
    if (dayStr) setSelectedDay(dayStr);
  };

  const getEventBadgeColor = (type: Event['type']) => {
    switch (type) {
      case 'deadline': return 'bg-rose-50 border-rose-100 text-rose-700';
      case 'milestone': return 'bg-purple-50 border-purple-100 text-purple-700';
      default: return 'bg-indigo-50 border-indigo-100 text-indigo-700';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 select-none font-sans bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8 flex-wrap gap-4 focus-within:ring-0">
        <div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 font-mono">
            TIMETABLE & CONSENSUS VOTING
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5 flex items-center space-x-2">
            <span>Schedules & Availability Pools</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Coordinate synchronous meetups without going back-and-forth in messy chat logs.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowEventForm(true)}
            className="cursor-pointer bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs p-3 rounded-xl transition-all shadow-xs"
          >
            Schedule Deadline
          </button>
          <button
            onClick={() => setShowPollForm(true)}
            className="cursor-pointer bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs p-3 rounded-xl transition-all shadow-md shadow-slate-900/15"
          >
            Create Slot Poll
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        
        {/* Left column (Span 2): Shared May 2026 grid custom calendar representation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-slate-900 text-base">May 2026 Academic Season</span>
              <span className="text-xs bg-slate-105 bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full border border-slate-200">
                Course: CS402-Group4
              </span>
            </div>

            {/* Calendar grid headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[10px] uppercase font-mono tracking-wider pb-2 border-b border-slate-100 mb-2">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            {/* Calendar Grid cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const dayEvents = cell ? getEventsForDay(cell) : [];
                const isSelected = selectedDay === cell;
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleCellClick(cell)}
                    className={`h-11 rounded-lg flex flex-col items-center justify-between py-1 transition-all cursor-pointer relative font-sans ${
                      !cell 
                        ? 'opacity-0 pointer-events-none' 
                        : isSelected 
                        ? 'bg-indigo-600 text-white font-extrabold shadow-sm shadow-indigo-500/10' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="text-xs">{cell}</span>
                    
                    {/* Event Dots indicator */}
                    {dayEvents.length > 0 && (
                      <div className="flex space-x-0.5 justify-center">
                        {dayEvents.map(evt => {
                          const isDeadline = evt.type === 'deadline';
                          return (
                            <span 
                              key={evt.id} 
                              className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : isDeadline ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Helper Alert Info Box */}
            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 mt-5 flex items-start space-x-2 text-indigo-900 text-xs">
              <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <span>Click any date on the calendar map above to inspect class milestones scheduling below.</span>
            </div>
          </div>

          {/* List representing selected dates timetable */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
            <h3 className="font-sans font-bold text-base text-slate-900 mb-4 flex items-center space-x-1.5">
              <span>Timetable details: May {selectedDay || 28}</span>
            </h3>

            <div className="space-y-3">
              {(() => {
                const activeEvts = selectedDay ? getEventsForDay(selectedDay) : [];
                if (activeEvts.length === 0) {
                  return (
                    <div className="text-xs text-slate-400 text-center py-6">
                      No milestones registered on this calendar index yet. Feel free to register custom sync-ups!
                    </div>
                  );
                }
                return activeEvts.map(evt => (
                  <div key={evt.id} className={`p-3.5 rounded-2xl border flex flex-col text-left ${getEventBadgeColor(evt.type)}`}>
                    <div className="flex justify-between items-start font-sans">
                      <span className="text-xs font-extrabold leading-tight">{evt.title}</span>
                      <span className="text-[9px] font-mono font-bold uppercase shrink-0 px-2 py-0.5 rounded-full bg-white/70 border border-current">{evt.type}</span>
                    </div>
                    <p className="text-[10px] font-medium leading-none mt-1 opacity-80">Hour: {evt.time.split(' ')[1] || 'ALL DAY'}</p>
                    <p className="text-[10px] mt-2.5 leading-relaxed opacity-90">{evt.description}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Right column (Span 3): Interactive scheduler slots availability poll widgets */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
            <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3.5 mb-5 flex items-center space-x-1.5">
              <Users className="w-5 h-5 text-indigo-500" />
              <span>Active Attendance slot Polls</span>
            </h3>

            <div className="space-y-6">
              {polls.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-6">
                  No availability polls active in university sandbox. Use the top button to draft scheduling.
                </div>
              ) : (
                polls.map(poll => {
                  const pollCreator = members.find(m => m.id === poll.createdBy);
                  return (
                    <div key={poll.id} className="p-5 bg-slate-50 border border-slate-200/65 rounded-3xl text-left relative">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs mb-3">
                        <span className="font-extrabold text-slate-800 text-sm leading-tight">{poll.title}</span>
                        <div className="flex items-center space-x-1.5 bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-md border border-indigo-100">
                          <span className="text-[9px] font-mono">DUE SOON</span>
                        </div>
                      </div>

                      <p className="text-slate-500 text-xs leading-relaxed mb-4">{poll.description}</p>
                      
                      {/* Sub slots choices voting selectors */}
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">Vote Availability</span>
                      
                      <div className="space-y-3">
                        {poll.proposedSlots.map(slot => {
                          const hasIVoted = slot.votedMemberIds.includes(currentUser.id);
                          return (
                            <button
                              key={slot.id}
                              onClick={() => votePollSlot(poll.id, slot.id)}
                              className={`cursor-pointer w-full p-4 rounded-xl border transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                hasIVoted 
                                  ? 'bg-indigo-550/10 border-indigo-555 bg-indigo-50/70 border-indigo-400' 
                                  : 'bg-white border-slate-205 border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              <div className="flex items-start space-x-2.5 min-w-0">
                                <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${hasIVoted ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  <Clock className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 text-xs block leading-tight">{slot.time}</span>
                                  
                                  {/* Avatars of voters mapped directly for flawless accountability indicator! */}
                                  <div className="flex -space-x-1 overflow-hidden mt-1.5">
                                    {slot.votedMemberIds.length === 0 ? (
                                      <span className="text-[9px] text-slate-400 font-mono">No responses yet</span>
                                    ) : (
                                      slot.votedMemberIds.map(vid => {
                                        const voter = members.find(m => m.id === vid);
                                        return (
                                          <span
                                            key={vid}
                                            title={voter?.name}
                                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white uppercase border border-white shrink-0 shadow-sm ${voter?.color || 'bg-slate-400'}`}
                                          >
                                            {voter?.avatar || 'ST'}
                                          </span>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="font-mono text-xs font-bold shrink-0 text-indigo-700 bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-100/50 self-end md:self-center">
                                {slot.votedMemberIds.length} votes
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Info footer metadata */}
                      <div className="mt-4 pt-3 border-t border-slate-200/40 text-[10px] text-slate-400 flex justify-between items-center font-semibold">
                        <span>Created by: {pollCreator?.name}</span>
                        <span>Expiration: {new Date(poll.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Dialog Box to create Poll slots */}
      {showPollForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 py-6 px-7 w-full max-w-md shadow-xl relative animate-scale-up max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowPollForm(false)}
              className="cursor-pointer absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Draft Slot Attendance Poll</h3>
            <p className="text-slate-500 text-xs mt-0.5">Let your teams vote transparently for lecture reviews.</p>

            <form onSubmit={handleAddNewPoll} className="mt-5 space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Meeting Agenda / Title</label>
                <input
                  type="text"
                  required
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="e.g. Backlogs code demo review session"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Poll Context Description</label>
                <textarea
                  value={pollDesc}
                  onChange={(e) => setPollDesc(e.target.value)}
                  placeholder="Summarize coordinates or presentation slides milestones."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Dynamic list slots builder inputs */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider">Proposed Slots List</label>
                  <button
                    type="button"
                    onClick={handleAddFieldSlot}
                    className="cursor-pointer text-xs font-bold text-indigo-650 text-indigo-600 hover:text-indigo-800 flex items-center font-mono uppercase"
                  >
                    + Add Slot
                  </button>
                </div>
                
                <div className="space-y-2">
                  {pollSlots.map((slot, idx) => (
                    <input
                      key={idx}
                      type="text"
                      required
                      value={slot}
                      onChange={(e) => handleChangeSlotText(idx, e.target.value)}
                      placeholder={`Slot #${idx + 1}: e.g. Monday @ 4:00 PM - 5:30 PM`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-900 font-sans text-xs focus:bg-white focus:border-indigo-500"
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowPollForm(false)}
                  className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer bg-slate-900 hover:bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md"
                >
                  Post Slot Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Dialog Box to create static calendar deadlines */}
      {showEventForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 py-6 px-7 w-full max-w-md shadow-xl relative animate-scale-up max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setShowEventForm(false)}
              className="cursor-pointer absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Register Timetable Deadline</h3>
            <p className="text-slate-500 text-xs mt-0.5">Alert teammates by booking custom academic milestone blocks.</p>

            <form onSubmit={handleAddCalendarEvent} className="mt-5 space-y-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Milestone Agenda Name</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Sprint Final Demo Code Lock"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Target Date-Hour</label>
                  <input
                    type="text"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="e.g. 2026-05-28 14:00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-900 font-sans text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as Event['type'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-900 font-sans text-xs focus:bg-white"
                  >
                    <option value="deadline">Final Assignment Deadline</option>
                    <option value="meeting">Team Synchronization Sync</option>
                    <option value="milestone">Academic Course Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Brief Content Details</label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Slide presentation indexes, testing coverage goals, etc."
                  rows={2.5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer bg-slate-900 hover:bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md"
                >
                  Post Sync milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
