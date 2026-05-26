import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { LayoutDashboard, Compass, Layers, Bell, LogOut, Cpu, Search, PlusCircle, CheckCircle, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: string; // active tab inside workspace OR 'dashboard'
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  openNotifications: () => void;
  unreadNotificationsCount: number;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  openNotifications,
  unreadNotificationsCount,
  onOpenSettings,
}) => {
  const { currentUser, groups, activeGroupId, setActiveGroupId } = useProject();

  return (
    <aside className="w-60 border-r border-[#E5E7EB] bg-white flex flex-col h-screen shrink-0 select-none font-sans sticky top-0">
      {/* Brand Logo & Platform Title */}
      <div className="p-4.5 border-b border-[#F3F4F6] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white font-mono font-bold text-base shadow-xs">
            0ø
          </div>
          <span className="font-bold text-base tracking-tight text-[#111111] select-none">
            0-Mess
          </span>
        </div>
      </div>

      {/* Main Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <span className="block px-3 text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2 font-mono">
          Navigate
        </span>

        {/* Dashboard Link (Home/All Projects View) */}
        <button
          onClick={() => {
            setActiveGroupId(null);
            onTabChange('overview'); // reset default group workspace tab
          }}
          className={`cursor-pointer w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-all text-xs font-semibold ${
            activeGroupId === null
              ? 'bg-[#F3F4F6] text-[#111111] font-bold'
              : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]'
          }`}
        >
          <Compass className={`w-4 h-4 ${activeGroupId === null ? 'text-[#4F46E5]' : 'text-[#888888]'}`} />
          <span>All Project Groups</span>
        </button>

        {/* List of joined groups */}
        <div className="pt-4">
          <span className="block px-3 text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2 font-mono">
            My Groups
          </span>
          <div className="space-y-1">
            {groups.map((group) => {
              const isSelected = activeGroupId === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setActiveGroupId(group.id);
                  }}
                  className={`cursor-pointer w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs ${
                    isSelected
                      ? 'bg-indigo-50/50 text-[#4F46E5] font-bold border-l-2 border-[#4F46E5]'
                      : 'text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA]'
                  }`}
                >
                  <span className="truncate pr-2 font-medium">{group.name}</span>
                  <span className="shrink-0 font-mono text-[9px] px-1.5 py-0.2 rounded-md bg-[#F3F4F6] text-[#666666]">
                    {group.id.split('-')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Notifications Drawer Link */}
        <div className="pt-4">
          <span className="block px-3 text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2 font-mono">
            System
          </span>
          <button
            onClick={openNotifications}
            className="cursor-pointer w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[#666666] hover:text-[#111111] hover:bg-[#FAFAFA] transition-all font-semibold"
          >
            <div className="flex items-center space-x-2.5">
              <Bell className="w-4 h-4 text-[#888888]" />
              <span>Notifications</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="bg-[#4F46E5] text-white font-mono text-[9px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* User Status Block */}
      <div className="p-4 border-t border-[#F3F4F6] bg-[#FAFAFA] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold text-white uppercase shrink-0 ${currentUser.color} shadow-xs`}>
            {currentUser.avatar}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#111111] text-xs truncate leading-none">{currentUser.name}</span>
            <span className="text-[10px] text-[#888888] truncate mt-0.5">{currentUser.role.split(' & ')[0]}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={onOpenSettings}
            title="Edit Profile Settings"
            className="cursor-pointer text-[#888888] hover:text-[#4F46E5] p-1 rounded transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={onLogout}
            title="Sign Out"
            className="cursor-pointer text-[#888888] hover:text-[#EF4444] p-1 rounded transition-all font-sans font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
