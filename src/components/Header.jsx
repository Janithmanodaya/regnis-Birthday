import React from 'react';
import { Cake, Send, ShieldCheck, Clock, Layers, Sparkles, Coins } from 'lucide-react';

export default function Header({ state, activeTab, setActiveTab, balanceInfo }) {
  const settings = state?.settings || {};
  const contactsCount = state?.contacts?.length || 0;
  const logsCount = state?.logs?.length || 0;

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-pink-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Cake className="w-6 h-6 text-pink-400 animate-bounce" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Regnis Wish SMS Engine
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full">
                Text.lk Sri Lanka
              </span>
            </div>
            <p className="text-xs text-slate-400">Automated Birthday Wishing & Excel Scheduler</p>
          </div>
        </div>

        {/* System Badges & Metrics */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Contacts:</span>
            <span className="font-semibold text-white">{contactsCount}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Send Time:</span>
            <span className="font-semibold text-white">{settings.sendTime || '09:00'}</span>
          </div>

          {/* Balance Pill */}
          {balanceInfo && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              balanceInfo.loading 
                ? 'bg-slate-800/40 text-slate-400 border-slate-700/50' 
                : balanceInfo.error 
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
            }`} title={balanceInfo.expiredOn ? `Expires on: ${balanceInfo.expiredOn}` : 'Credit balance'}>
              <Coins className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
              <span>
                {balanceInfo.loading ? (
                  'Syncing Credits...'
                ) : balanceInfo.error ? (
                  'Credit Sync Error'
                ) : (
                  `Credit: LKR ${parseFloat(balanceInfo.balance || 0).toFixed(2)}`
                )}
              </span>
            </div>
          )}

          {/* Mode Status Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
            settings.simulationMode 
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{settings.simulationMode ? 'Simulation Mode' : 'Live Gateway Active'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
