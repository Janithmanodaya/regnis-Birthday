import React, { useState } from 'react';
import { Cake, Users, Calendar, Send, FileSpreadsheet, Sparkles, CheckCircle2, ArrowRight, Clock, AlertCircle } from 'lucide-react';

export default function Dashboard({ state, setActiveTab, onRefreshState }) {
  const contacts = state?.contacts || [];
  const logs = state?.logs || [];
  const settings = state?.settings || {};
  const wishTemplate = state?.wishTemplate || '';

  const [testNumber, setTestNumber] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Compute Today & Upcoming Birthdays
  const today = new Date();
  const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const todayBirthdays = contacts.filter(c => {
    if (!c.birthday) return false;
    const parts = c.birthday.split('-');
    if (parts.length === 3) return `${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}` === todayMMDD;
    if (parts.length === 2) return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}` === todayMMDD;
    return false;
  });

  const scheduledCount = logs.filter(l => l.status === 'Scheduled').length;
  const sentCount = logs.filter(l => l.status === 'Sent' || l.status === 'Delivered').length;

  const handleQuickTest = async (e) => {
    e.preventDefault();
    if (!testNumber) return;
    setLoading(true);
    setTestStatus(null);
    try {
      const sampleMsg = wishTemplate.replace(/<<Name>>/gi, 'Valued Member').replace(/<<Department>>/gi, 'Regnis Team');
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testNumber, message: sampleMsg })
      });
      const data = await res.json();
      setTestStatus(data);
      if (onRefreshState) onRefreshState();
    } catch (err) {
      setTestStatus({ status: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-purple-950/90 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Sri Lanka SMS Gateway Platform
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              Automate Birthday Wishes for Your Entire Team
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Upload your Excel employee list, customize wishes with dynamic <span className="text-pink-400 font-mono font-bold">&lt;&lt;Name&gt;&gt;</span> fields, and let Regnis SMS Engine automatically deliver your wishes every morning via Text.lk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/template/download"
              download
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download Excel Template
            </a>
            <button
              onClick={() => setActiveTab('excel')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm transition-all"
            >
              Upload Excel Data <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Total Contacts</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{contacts.length}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Uploaded in database</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <Cake className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Today's Birthdays</p>
            <h3 className="text-2xl font-bold text-pink-400 mt-0.5">{todayBirthdays.length}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Celebrating today</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Scheduled Queue</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{scheduledCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Pending dispatches</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Delivered Wishes</p>
            <h3 className="text-2xl font-bold text-white mt-0.5">{sentCount}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Dispatched SMS log</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Birthdays & Quick SMS Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Celebrants */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Today's Birthdays ({todayBirthdays.length})</h3>
                <p className="text-xs text-slate-400">Automatic dispatches scheduled for {settings.sendTime || '09:00'} today</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-xs font-semibold text-pink-400 hover:text-pink-300 flex items-center gap-1"
            >
              View Queue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todayBirthdays.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-400">No birthdays recorded for today</p>
              <p className="text-xs text-slate-500">Upload your Excel list or check upcoming dispatches in the schedule queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todayBirthdays.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{c.name}</h4>
                    <p className="text-xs text-pink-400 font-mono mt-0.5">{c.phone}</p>
                    <span className="inline-block mt-1 text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      {c.department} • {c.designation}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <Clock className="w-3 h-3" /> {settings.sendTime || '09:00'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Test SMS Tool */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Send Instant Test SMS</h3>
              <p className="text-xs text-slate-400">Test Text.lk gateway connectivity</p>
            </div>
          </div>

          <form onSubmit={handleQuickTest} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recipient Phone Number (with 94 country code)
              </label>
              <input
                type="text"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="e.g. 0771234567 or 94771234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
              <span className="font-semibold text-slate-400">Current Wish Preview:</span>
              <p className="text-slate-300 line-clamp-3 italic">
                "{wishTemplate.replace(/<<Name>>/gi, 'Valued Member').replace(/<<Department>>/gi, 'Regnis Team')}"
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20"
            >
              {loading ? 'Dispatching...' : 'Dispatch Test SMS'}
              <Send className="w-3.5 h-3.5" />
            </button>

            {testStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testStatus.status ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}>
                {testStatus.status ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <div>
                  <p className="font-semibold">{testStatus.message}</p>
                  {testStatus.data?.uid && <p className="text-[10px] opacity-80 mt-0.5">UID: {testStatus.data.uid}</p>}
                </div>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
