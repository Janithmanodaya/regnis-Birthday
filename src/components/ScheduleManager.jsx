import React, { useState } from 'react';
import { Clock, Calendar, Send, CheckCircle2, AlertCircle, RefreshCw, Search, Trash2, Check, ShieldCheck } from 'lucide-react';

export default function ScheduleManager({ state, onRefreshState }) {
  const settings = state?.settings || {};
  const contacts = state?.contacts || [];
  const logs = state?.logs || [];

  const [sendTime, setSendTime] = useState(settings.sendTime || '09:00');
  const [savingTime, setSavingTime] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Handle Save Send Time
  const handleSaveSendTime = async () => {
    setSavingTime(true);
    setSaveSuccess(false);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { sendTime } })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onRefreshState) onRefreshState();
    } catch (err) {
      alert('Failed to save send time: ' + err.message);
    } finally {
      setSavingTime(false);
    }
  };

  // Sync / Generate All Schedules
  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/schedule/all', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(data.message || 'Schedules updated successfully!');
      if (onRefreshState) onRefreshState();
    } catch (err) {
      setSyncMsg('Failed to sync schedules: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear the dispatch history log?')) return;
    try {
      await fetch('/api/logs/clear', { method: 'POST' });
      if (onRefreshState) onRefreshState();
    } catch (err) {
      alert(err.message);
    }
  };

  // Compute Upcoming Birthdays with Schedule Timestamp
  const now = new Date();
  const currentYear = now.getFullYear();

  const upcomingQueue = contacts.map(c => {
    if (!c.birthday) return null;
    const parts = c.birthday.split('-');
    let month = '', day = '';
    if (parts.length === 3) { month = parts[1]; day = parts[2]; }
    else if (parts.length === 2) { month = parts[0]; day = parts[1]; }
    else return null;

    let targetDate = new Date(`${currentYear}-${month}-${day}T${sendTime}:00`);
    if (targetDate < now) {
      targetDate = new Date(`${currentYear + 1}-${month}-${day}T${sendTime}:00`);
    }

    const rfc3339Time = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')} ${sendTime}`;

    return {
      contact: c,
      targetDate,
      scheduleTimeFormatted: rfc3339Time,
      daysUntil: Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24))
    };
  }).filter(Boolean).sort((a, b) => a.targetDate - b.targetDate);

  // Filtered Logs
  const filteredLogs = logs.filter(l => 
    l.contactName?.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.phone?.includes(logSearch) ||
    l.status?.toLowerCase().includes(logSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Top Banner & Send Time Selector */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Time & Schedule Management</h2>
            </div>
            <p className="text-xs text-slate-400">
              Configure daily dispatch execution time and sync scheduled Text.lk API birthday requests.
            </p>
          </div>

          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Dispatches...' : 'Sync & Re-calculate All Schedules'}
          </button>
        </div>

        {/* Daily Dispatch Time Picker Box */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Daily Wish Dispatch Time</h3>
            <p className="text-xs text-slate-400">
              Every employee having a birthday will receive their wish at this specific time. Text.lk RFC3339 schedule timestamp will format as: <code className="text-pink-400 font-mono">YYYY-MM-DD {sendTime}</code>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSaveSendTime}
              disabled={savingTime}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              {saveSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-purple-400" />}
              {saveSuccess ? 'Time Saved!' : 'Save Time'}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            {syncMsg}
          </div>
        )}

      </div>

      {/* Upcoming Birthday Schedule Timeline */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-bold text-white">Upcoming Birthday Dispatches Queue</h3>
          </div>
          <span className="text-xs text-slate-400">Calculated for next 365 days</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcomingQueue.slice(0, 6).map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.contact.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.daysUntil === 0 
                    ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30 animate-pulse' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.daysUntil === 0 ? 'TODAY!' : `In ${item.daysUntil} days`}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>Phone: {item.contact.phone}</span>
                <span>{item.contact.department}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-purple-300 font-mono">
                RFC3339 Time: {item.scheduleTimeFormatted}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dispatched SMS Logs Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">SMS Gateway Dispatch Logs ({logs.length})</h3>
            <p className="text-xs text-slate-400">History of queued, sent, and simulated birthday wishes</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search log history..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              onClick={handleClearLogs}
              className="p-2 rounded-xl bg-slate-950 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
              title="Clear History Log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Scheduled / Sent Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Message Snippet</th>
                <th className="py-3.5 px-4 text-right">Date Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No dispatch history recorded yet
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{log.contactName}</td>
                    <td className="py-3 px-4 font-mono text-emerald-400">{log.phone}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{log.scheduledTime}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.status === 'Scheduled' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' :
                        log.status === 'Sent' || log.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                        'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}>
                        {log.response?.isSimulated && <ShieldCheck className="w-3 h-3" />}
                        {log.status} {log.response?.isSimulated && '(Simulated)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{log.message}</td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
