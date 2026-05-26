import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { ShieldCheck, ArrowRight, UserCheck, MessageSquare, Award, Sparkles, HelpCircle } from 'lucide-react';

export const FeedbackView: React.FC = () => {
  const { members, currentUser, feedback, submitFeedback } = useProject();

  // Peer review form states
  const [targetMemberId, setTargetMemberId] = useState<string>('');
  
  // Rating states (out of 5)
  const [ratingQuality, setRatingQuality] = useState<number>(5);
  const [ratingReliability, setRatingReliability] = useState<number>(5);
  const [ratingCommunication, setRatingCommunication] = useState<number>(5);
  const [ratingContribution, setRatingContribution] = useState<number>(5);
  
  const [feedbackComment, setFeedbackComment] = useState<string>('');

  // Handle peer submission
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberId) return;

    submitFeedback(
      targetMemberId,
      ratingQuality,
      ratingReliability,
      ratingCommunication,
      ratingContribution,
      feedbackComment
    );

    // Reset Form
    setTargetMemberId('');
    setRatingQuality(5);
    setRatingReliability(5);
    setRatingCommunication(5);
    setRatingContribution(5);
    setFeedbackComment('');
  };

  // Filter members that can be evaluated (hide yourself)
  const peerMembers = members.filter(m => m.id !== currentUser.id);

  // Fetch feedback submitted *to me* (Alex Mercer) for the analytics card!
  const myFeedback = feedback.filter(f => f.toMemberId === currentUser.id);

  // Calculate self rating metrics dynamically based on my feedback!
  const metricsCount = myFeedback.length;
  
  const selfQuality = metricsCount > 0 
    ? parseFloat((myFeedback.reduce((sum, f) => sum + f.ratingQuality, 0) / metricsCount).toFixed(1)) 
    : 4.8; // Default initial sandbox values
  
  const selfReliability = metricsCount > 0 
    ? parseFloat((myFeedback.reduce((sum, f) => sum + f.ratingReliability, 0) / metricsCount).toFixed(1)) 
    : 4.6;
  
  const selfCommunication = metricsCount > 0 
    ? parseFloat((myFeedback.reduce((sum, f) => sum + f.ratingCommunication, 0) / metricsCount).toFixed(1)) 
    : 4.9;

  const selfContribution = metricsCount > 0 
    ? parseFloat((myFeedback.reduce((sum, f) => sum + f.ratingContribution, 0) / metricsCount).toFixed(1)) 
    : 4.7;

  const totalWeightedAvg = parseFloat(((selfQuality + selfReliability + selfCommunication + selfContribution) / 4).toFixed(1));

  // Rating label indicators
  const getRatingLabel = (val: number) => {
    if (val >= 4.8) return 'Exceptional';
    if (val >= 4.0) return 'Highly Cooperative';
    if (val >= 3.0) return 'Adequate / Met Goals';
    if (val >= 2.0) return 'Inconsistent Speed';
    return 'Action Needed / Unresponsive';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 select-none font-sans bg-slate-50/50">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100 font-mono">
          DOUBLE-BLIND PEER REVIEW SYSTEM
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5 flex items-center space-x-2">
          <span>Anonymous Peer Evaluations</span>
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Evaluate work habits honestly. Reviews are aggregated, anonymized, and randomized to prevent interpersonal friction.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
        {/* Left Card Panel: Form to submit evaluations (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs h-fit">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-4 mb-5">
            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <h3 className="font-sans font-bold text-base text-slate-900 leading-none">Submit Peer Audit</h3>
              <span className="text-[10px] text-slate-400 font-medium">Unalterably encrypted before storage</span>
            </div>
          </div>

          <form onSubmit={handleSubmitFeedback} className="space-y-5">
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Select Team Member</label>
              <select
                required
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500"
              >
                <option value="">-- Choose Colleague to Evaluate --</option>
                {peerMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role.split(' & ')[0]})</option>
                ))}
              </select>
            </div>

            {/* Sliders Area */}
            <div className="space-y-4">
              {/* slider 1 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-sans font-semibold text-slate-700">
                  <span>1. Work & Code Quality</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-sm font-bold">{ratingQuality}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={ratingQuality}
                  onChange={(e) => setRatingQuality(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase font-mono tracking-wider">
                  <span>Slow</span>
                  <span>Average</span>
                  <span>Exceptional</span>
                </div>
              </div>

              {/* slider 2 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-sans font-semibold text-slate-700">
                  <span>2. Reliability & Deadline Speed</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-sm font-bold">{ratingReliability}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={ratingReliability}
                  onChange={(e) => setRatingReliability(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase font-mono tracking-wider">
                  <span>Delays</span>
                  <span>On Time</span>
                  <span>Pushes Early</span>
                </div>
              </div>

              {/* slider 3 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-sans font-semibold text-slate-700">
                  <span>3. Communication & Cooperation</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-sm font-bold">{ratingCommunication}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={ratingCommunication}
                  onChange={(e) => setRatingCommunication(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase font-mono tracking-wider">
                  <span>Silent</span>
                  <span>Replies Daily</span>
                  <span>Always Syncing</span>
                </div>
              </div>

              {/* slider 4 */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5 font-sans font-semibold text-slate-700">
                  <span>4. Direct Technical Contribution</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-sm font-bold">{ratingContribution}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={ratingContribution}
                  onChange={(e) => setRatingContribution(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1 uppercase font-mono tracking-wider">
                  <span>Minimal</span>
                  <span>Substantial</span>
                  <span>Heavy Lift</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Anonymous Feedback Comment</label>
              <textarea
                required
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Details of their performance, major modules they pushed, or specific blockages solved."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-900 font-sans text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Comments are scrambled in the database. Authors remain strictly randomized.</span>
            </div>

            <button
              type="submit"
              className="cursor-pointer w-full bg-linear-to-r from-indigo-650 to-indigo-600 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-500/10 transition-colors flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider"
            >
              <span>Submit Scrambled Review</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>

        {/* Right Panel: My Aggregated Scoreboard & Comments (Span 3) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Main User Contribution analytics widget */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-sans font-bold text-base text-slate-900">My Aggregated Evaluation</h3>
                <p className="text-xs text-slate-400">Current running averages from your team members reviews</p>
              </div>
              <div className="bg-indigo-550/5 text-indigo-700 font-bold px-3 py-2 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center shrink-0">
                <span className="text-[10px] uppercase font-mono tracking-wider block">Running average</span>
                <span className="text-2xl font-mono font-extrabold">{totalWeightedAvg * 2} <span className="text-xs text-slate-400">/ 10</span></span>
              </div>
            </div>

            {/* Metrics Breakdowns Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Work Quality</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-xl font-mono font-extrabold text-slate-800">{selfQuality}</span>
                  <span className="text-[10px] text-slate-400">/ 5</span>
                </div>
                <div className="w-full bg-slate-205 bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(selfQuality / 5) * 100}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 italic block mt-1">{getRatingLabel(selfQuality)}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Reliability Speed</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-xl font-mono font-extrabold text-slate-800">{selfReliability}</span>
                  <span className="text-[10px] text-slate-400">/ 5</span>
                </div>
                <div className="w-full bg-slate-205 bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(selfReliability / 5) * 100}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 italic block mt-1">{getRatingLabel(selfReliability)}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Cooperative Comms</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-xl font-mono font-extrabold text-slate-800">{selfCommunication}</span>
                  <span className="text-[10px] text-slate-400">/ 5</span>
                </div>
                <div className="w-full bg-slate-205 bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(selfCommunication / 5) * 100}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 italic block mt-1">{getRatingLabel(selfCommunication)}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider block font-bold">Technical Contribution</span>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-xl font-mono font-extrabold text-slate-800">{selfContribution}</span>
                  <span className="text-[10px] text-slate-400">/ 5</span>
                </div>
                <div className="w-full bg-slate-205 bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(selfContribution / 5) * 100}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 italic block mt-1">{getRatingLabel(selfContribution)}</span>
              </div>
            </div>
          </div>

          {/* Blind Feed of comments */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs">
            <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3.5 mb-5 flex items-center space-x-1.5">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              <span>Decryption Key: Peer Contribution Logs</span>
            </h3>

            <div className="space-y-4">
              {myFeedback.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-6">
                  No evaluations indexed in user sandbox feedback pool yet. Use the left console to review other group colleagues.
                </div>
              ) : (
                myFeedback.map((f, i) => {
                  return (
                    <div key={f.id} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl relative">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 font-mono">
                        <span className="flex items-center space-x-1.5">
                          <Award className="w-4 h-4 text-purple-600" />
                          <span>Anonymous Peer-Sync #{f.fromAnonymousId.split('_')[1] || i + 10}</span>
                        </span>
                        <span>{new Date(f.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>

                      <p className="text-slate-600 text-xs leading-relaxed italic pr-4">
                        "{f.comment}"
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3.5 pt-3 border-t border-slate-200/40 text-[9px] font-bold font-mono text-slate-500">
                        <span>Quality: {f.ratingQuality}/5</span>
                        <span>•</span>
                        <span>Reliability: {f.ratingReliability}/5</span>
                        <span>•</span>
                        <span>Comms: {f.ratingCommunication}/5</span>
                        <span>•</span>
                        <span>Weight: {f.ratingContribution}/5</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
