import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, Cpu, Calendar, Users, MessageSquare, Check, Mail, Linkedin, Files } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onGoLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onGoLogin }) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] flex flex-col font-sans select-none overflow-x-hidden antialiased">
      {/* Elegant minimalist header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex flex-col items-center justify-center text-white font-mono font-bold text-base shadow-sm">
            0ø
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-[#111111]">
            0-Mess
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-12 pb-24 flex flex-col items-center">
        {/* Serene Badge */}
        <div className="mb-8 inline-flex items-center space-x-2 bg-[#F3F4F6] border border-[#E5E7EB] px-3 py-1.5 rounded-full text-[11px] text-[#4F46E5] font-semibold tracking-wider uppercase font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Group Project Reimagined</span>
        </div>

        {/* Short Tagline & Main Heading */}
        <h1 className="text-center font-sans font-extrabold text-4xl sm:text-5xl md:text-6xl text-[#111111] tracking-tight leading-[1.1] max-w-4xl mb-6">
          AI-powered management tool <br />
          <span className="text-[#4F46E5]">for group projects.</span>
        </h1>

        {/* Secondary description */}
        <p className="text-center max-w-2xl text-sm sm:text-base text-[#666666] leading-relaxed mb-10">
          A zero-stress workspace built for group projects and assignments. Designed for university students, but useful for any team collaboration. Got a project and multiple members? This platform is built for you.
        </p>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center mb-16">
          <button 
            onClick={onStart} 
            className="cursor-pointer w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm px-8 py-3.5 rounded-xl transition-all shadow-sm shadow-indigo-500/20 active:scale-[0.98]"
          >
            Sign Up
          </button>
          <button 
            onClick={onGoLogin} 
            className="cursor-pointer w-full sm:w-auto bg-white border border-[#E5E7EB] hover:bg-[#FAFAFA] text-[#111111] font-semibold text-sm px-8 py-3.5 rounded-xl transition-all"
          >
            Log In
          </button>
        </div>

        {/* High-fidelity Mockup Layout exhibiting actual application interfaces */}
        <div className="w-full bg-white border border-[#E5E7EB] rounded-2xl p-2.5 shadow-xs mb-16 relative">
          <div className="rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#F9FAFB] flex flex-col">
            {/* Minimal Windows Header with live indicators */}
            <div className="bg-white px-4 py-3.5 flex items-center justify-between border-b border-[#F3F4F6]">
              <div className="flex space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Live Workspace</span>
              </div>
            </div>
            
            {/* Mockup grids modeling actual app features */}
            <div className="p-4 md:p-6 text-left grid grid-cols-1 lg:grid-cols-3 gap-5 bg-[#FAFAFA]">
              
              {/* Feature Box 1: Toggleable Milestones (Actual component) */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4.5 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className="text-[10px] font-mono uppercase text-[#4F46E5] font-extrabold tracking-wider">Milestone Timeline</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Interactive</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2.5">
                      <div className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 line-through">Draft System Architecture docs</span>
                        <p className="text-[9.5px] text-slate-400 line-through mt-0.5">Define partition simulation boundaries and state-machines.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2.5 border-t border-slate-50 pt-2.5">
                      <div className="w-4 h-4 rounded border border-slate-300 bg-white text-transparent flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800">Final Presentation & Class Live Demo</span>
                        <p className="text-[9.5px] text-slate-500 mt-0.5">Coordinate code branches and prepare grading slides.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F3F4F6] pt-3.5 mt-3 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400">Target Tracked</span>
                  <span className="text-[#4F46E5] font-bold">Try toggle in-app!</span>
                </div>
              </div>

              {/* Feature Box 2: Attendance Availability Ballot */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4.5 flex flex-col justify-between min-h-[220px]">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <span className="text-[10px] font-mono uppercase text-[#4F46E5] font-extrabold tracking-wider">Attendance ballots</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Polls Setup</span>
                  </div>
                  
                  <p className="text-[10.5px] text-slate-600 font-medium leading-relaxed mb-3">
                    Pick slots from a built-in calendar popup, then draft a group vote:
                  </p>

                  <div className="space-y-1.5">
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-2 flex items-center justify-between text-[10px]">
                      <div>
                        <span className="font-bold block text-slate-800">Mon, May 25, 4:00 PM</span>
                        <span className="text-[9px] text-slate-400">3 group votes signed</span>
                      </div>
                      <span className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-2 py-0.5 rounded text-[9px] font-bold">Voted</span>
                    </div>

                    <div className="bg-white border border-slate-150 rounded-lg p-2 flex items-center justify-between text-[10px]">
                      <div>
                        <span className="font-bold block text-slate-800">Wed, May 27, 5:00 PM</span>
                        <span className="text-[9px] text-slate-400">0 votes</span>
                      </div>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[9px] font-bold">Cast Vote</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F3F4F6] pt-3 mt-2 text-[9px] font-mono text-center text-slate-400">
                  Attendance slots auto-sync with group calendar maps
                </div>
              </div>

              {/* Feature Box 3: 0-Mess Live AI Chatbot */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4.5 flex flex-col justify-between min-h-[220px] shadow-xs">
                <div>
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-3">
                    <span className="text-[10px] font-mono uppercase text-[#4F46E5] font-extrabold tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      <span>0-Mess AI Assistant</span>
                    </span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">Active Chat</span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-indigo-50/50 p-2 rounded-lg text-left">
                      <span className="text-[8px] uppercase tracking-wider text-indigo-600 font-mono font-bold block">Ethan asked:</span>
                      <p className="text-[10px] text-indigo-900 mt-0.5 font-medium">"How do we resolve late submissions?"</p>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg text-left border border-slate-100">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold block">AI Partner feedback:</span>
                      <p className="text-[9.5px] text-slate-600 mt-0.5 leading-normal italic">
                        "Break the backlog down into smaller subtasks, and add milestone timeline toggles for transparency."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F3F4F6] pt-2.5 mt-2 flex items-center space-x-1.5 text-[9px] font-mono text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Interactive Chat Panel built in-app</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Serene Core Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl text-left border-t border-[#E5E7EB] pt-12">
          
          {/* Feature 1: Chat with AI */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center mb-4">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <h4 className="font-bold text-sm text-[#111111] uppercase tracking-wider mb-2 font-mono">AI Assistant</h4>
              <p className="text-xs text-[#666666]/90 leading-relaxed">
                Stuck at 3AM trying to figure out how to actually do your part of the project? Need a quick summary, explanation, or help? The built-in AI assistant helps your team manage projects, answer questions, and stay on track instantly.
              </p>
            </div>
            <span className="text-[10px] text-[#4F46E5] font-bold font-mono mt-4 block">LIVE CONTEXT</span>
          </div>

          {/* Feature 2: Task Suggestion & Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center mb-4">
                <Cpu className="w-4.5 h-4.5" />
              </div>
              <h4 className="font-bold text-sm text-[#111111] uppercase tracking-wider mb-2 font-mono">Task Distribution</h4>
              <p className="text-xs text-[#666666]/90 leading-relaxed">
                One teammate doing everything while the others say “I can help later”? AI Task Distribution helps divide work fairly based on team size, workload, and project timeline so everyone knows what to do from the start.
              </p>
            </div>
            <span className="text-[10px] text-[#4F46E5] font-bold font-mono mt-4 block">SMART ALLOCATION</span>
          </div>

          {/* Feature 3: Progress & Contribution index */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center mb-4">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
              <h4 className="font-bold text-sm text-[#111111] uppercase tracking-wider mb-2 font-mono">Contribution Tracker</h4>
              <p className="text-xs text-[#666666]/90 leading-relaxed">
                “Wait… who actually did the work?” Contribution Tracker records updates, progress, and activity logs transparently, making teamwork more accountable and contributions easier to track. You don't have to recall from the beginning anymore and make up stories when your lecturer ask you how your team distributed works.
              </p>
            </div>
            <span className="text-[10px] text-[#4F46E5] font-bold font-mono mt-4 block">ACCOUNTABILITY TRACK</span>
          </div>

          {/* Feature 4: Scheduler & Calendar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center mb-4">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <h4 className="font-bold text-sm text-[#111111] uppercase tracking-wider mb-2 font-mono">Shared Scheduler</h4>
              <p className="text-xs text-[#666666]/90 leading-relaxed">
                Trying to find one meeting time when everyone is free feels impossible sometimes. Shared Scheduler lets teams vote on meeting times, track deadlines, and manage everything in one shared calendar.
              </p>
            </div>
            <span className="text-[10px] text-[#4F46E5] font-bold font-mono mt-4 block">TEAM CALENDAR</span>
          </div>

          {/* Feature 5: Shared Resources */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center mb-4">
                <Files className="w-4.5 h-4.5" />
              </div>
              <h4 className="font-bold text-sm text-[#111111] uppercase tracking-wider mb-2 font-mono">Shared Resources</h4>
              <p className="text-xs text-[#666666]/90 leading-relaxed">
                Cluttered links? Files everywhere? “final”, “final2”, “final_final_REAL”? Don’t even know which one is the actual final version anymore? Shared Resources keeps everything organized in one place, so your team always works on the latest file.
              </p>
            </div>
            <span className="text-[10px] text-[#4F46E5] font-bold font-mono mt-4 block">CENTRALIZED FILING</span>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-8 border-t border-[#E5E7EB] text-xs text-[#999999] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-left sm:text-left flex flex-col gap-1">
          <p>© 2026 0-Mess. Reimagined for group projects and teamwork.</p>
        </div>

        {/* Contact Developer Section */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0 text-left sm:text-right">
          <span className="font-medium text-[#111111]/70 font-sans tracking-wide text-xs">Feedback is always appreciated, feel free to reach out!</span>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <a 
              href="mailto:fungmaye5@gmail.com" 
              className="flex items-center space-x-1.5 hover:text-[#4F46E5] text-slate-500 hover:font-semibold transition-all"
              title="Email Developer"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>fungmaye5@gmail.com</span>
            </a>
            <span className="hidden sm:inline text-slate-300">•</span>
            <a 
              href="https://www.linkedin.com/in/fungmayethen/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center space-x-1.5 hover:text-[#4F46E5] text-slate-500 hover:font-semibold transition-all"
              title="LinkedIn Profile"
            >
              <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

