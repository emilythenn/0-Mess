import { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { GroupWorkspaceView } from './components/GroupWorkspaceView';
import { NotificationsPanel } from './components/NotificationsPanel';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { Menu, X, Bell, Compass } from 'lucide-react';

function AppContent() {
  const { isLoggedIn, logout, notifications, activeGroupId, setActiveGroupId } = useProject();
  
  // Navigation Routing States
  // Unauthenticated screens: 'landing' | 'auth'
  const [sessionScreen, setSessionScreen] = useState<'landing' | 'auth'>('landing');
  const [authDefaultMode, setAuthDefaultMode] = useState<'login' | 'signup'>('login');
  
  // Active inner workspace tab inside the GroupWorkspaceView
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Trigger Notifications Sidebar panel Overlay
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Trigger Profile Settings Modal
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Mobile navigation drawer toggle
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // 1. Unauthenticated layout
  if (!isLoggedIn) {
    if (sessionScreen === 'landing') {
      return (
        <LandingPage 
          onStart={() => {
            setAuthDefaultMode('signup');
            setSessionScreen('auth');
          }} 
          onGoLogin={() => {
            setAuthDefaultMode('login');
            setSessionScreen('auth');
          }}
        />
      );
    }
    return (
      <AuthPage 
        onBack={() => setSessionScreen('landing')} 
        defaultMode={authDefaultMode}
        onSuccess={() => {
          setSessionScreen('landing'); // reset
          setActiveGroupId(null); // start on main dashboard list of groups
        }}
      />
    );
  }

  // 2. Authenticated System Layout
  return (
    <div className="flex h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans overflow-hidden w-full relative">
      
      {/* Sidebar - Stuck on desktop left, hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            setActiveTab(tab);
            setShowMobileMenu(false);
          }} 
          onLogout={logout}
          openNotifications={() => setShowNotifications(true)}
          unreadNotificationsCount={unreadCount}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Main Workspace Scroll Frame */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative h-full w-full bg-white">
        
        {/* Mobile Header bar */}
        <header className="md:hidden h-14 border-b border-[#F3F4F6] bg-white px-5 flex items-center justify-between z-30 shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <div className="w-6.5 h-6.5 bg-[#4F46E5] rounded-md flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs">
              0ø
            </div>
            <span className="font-bold text-xs tracking-tight text-[#111111]">0-Mess</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-1.5 hover:bg-[#FAFAFA] rounded-md text-[#555555] transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#4F46E5] text-white font-mono text-[8px] h-3.5 w-3.5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1.5 hover:bg-[#FAFAFA] rounded-md text-[#111111] transition-all cursor-pointer"
            >
              {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile responsive navigation overlay menu */}
        {showMobileMenu && (
          <div className="fixed inset-x-0 top-14 bg-white border-b border-[#E5E7EB] p-4.5 shadow-md z-45 flex flex-col space-y-1.5 md:hidden select-none text-left">
            <button
              onClick={() => {
                setActiveGroupId(null);
                setShowMobileMenu(false);
              }}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all ${
                activeGroupId === null 
                  ? 'bg-[#F3F4F6] text-[#111111]' 
                  : 'text-[#666666] hover:bg-[#FAFAFA]'
              }`}
            >
              All Project Groups
            </button>
            
            <button
              onClick={logout}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold text-red-650 text-red-600 text-left hover:bg-red-50 mt-2 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Dynamic Page Content Render */}
        <main className="flex-1 overflow-hidden relative h-full w-full">
          {activeGroupId === null ? (
            /* RENDER MAIN DASHBOARD GROUP CARDS LIST */
            <div className="h-full overflow-y-auto">
              <DashboardView />
            </div>
          ) : (
            /* RENDER ACTIVE GROUP WORKSPACE */
            <GroupWorkspaceView />
          )}
        </main>
      </div>

      {/* Slide-in Notifications Panel Drawer */}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* Profile Settings Modal Overlay */}
      {showSettings && (
        <ProfileSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
