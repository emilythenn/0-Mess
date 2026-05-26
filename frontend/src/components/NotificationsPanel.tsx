import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Bell, Check, Trash2, X, AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react';

interface NotificationsPanelProps {
  onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
  const { notifications, markNotificationRead, clearNotifications } = useProject();

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-bounce" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      default: return <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />;
    }
  };

  const getContainerColor = (read: boolean, type: string) => {
    if (read) return 'bg-white opacity-60';
    switch (type) {
      case 'alert': return 'bg-rose-50/50 border-rose-100';
      case 'success': return 'bg-emerald-50/50 border-emerald-100';
      default: return 'bg-indigo-50/50 border-indigo-100';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200/80 shadow-2xl z-50 flex flex-col h-screen font-sans select-none animate-slide-in-right">
      {/* Panel Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Bell className="w-5 h-5 text-indigo-600" />
          <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Academic Alerts</h2>
        </div>
        
        <div className="flex items-center space-x-1.5 font-sans">
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="cursor-pointer text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-50 rounded-lg transition-all text-xs font-semibold flex items-center space-x-1 border border-slate-100"
              title="Clear all alerts"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="cursor-pointer text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notifications Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="p-4 bg-slate-50 text-slate-350 border border-slate-150 rounded-full mb-3">
              <Bell className="w-6 h-6 text-slate-300" />
            </span>
            <h4 className="font-bold text-slate-700 text-sm">All logs is clear.</h4>
            <p className="text-slate-400 text-xs mt-1">No pending sprint alerts or voting notices registered.</p>
          </div>
        ) : (
          notifications.map((not) => {
            return (
              <div 
                key={not.id} 
                className={`p-4 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all ${getContainerColor(not.read, not.type)}`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  {getIcon(not.type)}
                  <div className="min-w-0 pr-1">
                    <h5 className="font-bold text-slate-800 text-xs leading-snug">{not.title}</h5>
                    <p className="text-slate-500 text-xs mt-1 leading-normal break-words">{not.message}</p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-2 font-semibold">
                      {new Date(not.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Mark as read button */}
                {!not.read && (
                  <button
                    onClick={() => markNotificationRead(not.id)}
                    className="cursor-pointer p-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-400 hover:text-indigo-600 rounded-lg shadow-2xs transition-all shrink-0"
                    title="Mark as Read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary Info */}
      <div className="p-4 bg-slate-50 border-t border-slate-100/80 font-mono text-[10px] text-slate-400 text-center font-bold uppercase tracking-wider">
        <span>May 2026 Term Synchronization Engine</span>
      </div>
    </div>
  );
};
