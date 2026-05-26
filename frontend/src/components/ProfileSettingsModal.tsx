import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { X, User, Shield, Check, AlertCircle } from 'lucide-react';

interface ProfileSettingsModalProps {
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ onClose }) => {
  const { currentUser, updateProfile } = useProject();
  
  const [name, setName] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [siswaMail, setSiswaMail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [currentSemester, setCurrentSemester] = useState('');
  const [nationality, setNationality] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state with current user info
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setMatricNumber(currentUser.matricNumber || '');
      setSiswaMail(currentUser.siswaMail || '');
      setPersonalEmail(currentUser.personalEmail || '');
      setUniversity(currentUser.university || '');
      setCourse(currentUser.course || '');
      setCurrentSemester(currentUser.currentSemester || '');
      setNationality(currentUser.nationality || '');
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSaveStatus({ type: 'error', message: 'Name is a required field.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    const success = await updateProfile({
      name: name.trim(),
      matricNumber: matricNumber.trim(),
      siswaMail: siswaMail.trim(),
      personalEmail: personalEmail.trim(),
      university: university.trim(),
      course: course.trim(),
      currentSemester: currentSemester.trim(),
      nationality: nationality.trim()
    });

    setIsSaving(false);
    if (success) {
      setSaveStatus({ type: 'success', message: 'Profile settings updated and synced successfully.' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setSaveStatus({ type: 'error', message: 'Connection issue. Saved locally.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans select-none animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col relative animate-scale-up text-left overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#111111] tracking-tight">Account Profile Settings</h3>
              <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Edit academic enrollment and personal identity details.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {saveStatus && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 animate-fade-in ${
              saveStatus.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              {saveStatus.type === 'success' ? <Check className="w-4.5 h-4.5 shrink-0" /> : <AlertCircle className="w-4.5 h-4.5 shrink-0" />}
              <span>{saveStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* Matric Number */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Matric Number</label>
              <input
                type="text"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. U2004561"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* Siswa Mail */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Siswa Mail (Student Email)</label>
              <input
                type="email"
                value={siswaMail}
                onChange={(e) => setSiswaMail(e.target.value)}
                placeholder="e.g. alex@siswa.um.edu.my"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* Personal Email */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Personal Email</label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="e.g. alex.j@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* University */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">University</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. Universiti Malaya"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Course / Major Name</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Computer Science (Software Eng.)"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* Current Semester */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Current Semester</label>
              <input
                type="text"
                value={currentSemester}
                onChange={(e) => setCurrentSemester(e.target.value)}
                placeholder="e.g. Semester 2, Year 3"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Malaysian"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2 rounded-lg text-xs outline-none transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex space-x-2 shrink-0">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-[#111111] hover:bg-[#4F46E5] text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center disabled:bg-slate-350"
            >
              {isSaving ? 'Syncing...' : 'Save Settings'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-650 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
