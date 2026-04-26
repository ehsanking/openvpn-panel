'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Users, Activity, Settings as SettingsIcon, LayoutDashboard, Menu, X, Network, Server, UserCheck } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import DashboardView from '@/components/views/dashboard-view';
import { UsersView } from '@/components/views/users-view';
import SessionsView from '@/components/views/sessions-view';
import SettingsView from '@/components/views/settings-view';
import InboundsView from '@/components/views/inbounds-view';
import { RepresentativesView } from '@/components/views/representatives-view';
import { NodesView } from '@/components/views/nodes-view';
import { Toaster } from 'sonner';

type ViewType = 'dashboard' | 'users' | 'inbounds' | 'sessions' | 'settings' | 'representatives' | 'nodes';

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'representatives', label: 'Representatives', icon: UserCheck },
    { id: 'nodes', label: 'Nodes', icon: Server },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'inbounds', label: 'Inbounds', icon: Network },
    { id: 'sessions', label: 'Sessions', icon: Activity },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'representatives':
        return <RepresentativesView />;
      case 'nodes':
        return <NodesView />;
      case 'users':
        return <UsersView />;
      case 'inbounds':
        return <InboundsView />;
      case 'sessions':
        return <SessionsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-right" richColors />
      
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-sm border border-gray-200"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Content - Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 tracking-tight">PowerVPN</h1>
              <p className="text-xs text-gray-400 font-medium">Management Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <item.icon size={20} className={isActive ? 'text-blue-500' : 'text-gray-400'} />
                {item.label}
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium text-center">Version 1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <ErrorBoundary>
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
