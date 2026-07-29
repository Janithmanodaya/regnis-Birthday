import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ExcelManager from './components/ExcelManager';
import TemplateEditor from './components/TemplateEditor';
import ScheduleManager from './components/ScheduleManager';
import ApiSettings from './components/ApiSettings';
import BulkMessenger from './components/BulkMessenger';
import { LayoutDashboard, FileSpreadsheet, Sparkles, Clock, Settings, RefreshCw, SendHorizontal } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [state, setState] = useState({
    contacts: [],
    wishTemplate: '',
    settings: {},
    logs: [],
    customLists: []
  });
  const [loading, setLoading] = useState(true);
  const [balanceInfo, setBalanceInfo] = useState({ loading: true, balance: null, expiredOn: null, error: null });

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/balance');
      const data = await res.json();
      if (data.success) {
        setBalanceInfo({ loading: false, balance: data.balance, expiredOn: data.expiredOn, error: null });
      } else {
        setBalanceInfo({ loading: false, balance: null, expiredOn: null, error: data.error });
      }
    } catch (err) {
      setBalanceInfo({ loading: false, balance: null, expiredOn: null, error: err.message });
    }
  };

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
      fetchBalance();
    } catch (err) {
      console.error('Error fetching state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'excel', label: 'Excel Import & Data', icon: FileSpreadsheet, badge: state.contacts?.length },
    { id: 'bulk', label: 'Bulk Messenger', icon: SendHorizontal },
    { id: 'template', label: 'Wish Template Editor', icon: Sparkles },
    { id: 'schedule', label: 'Schedule & Queue', icon: Clock, badge: state.logs?.filter(l => l.status === 'Scheduled')?.length },
    { id: 'api', label: 'Gateway Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-pink-500 selection:text-white">
      
      {/* Header Bar */}
      <Header state={state} activeTab={activeTab} setActiveTab={setActiveTab} balanceInfo={balanceInfo} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="glass-panel p-2 rounded-2xl border border-slate-800 flex items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/20 scale-[1.02]' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchState}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Refresh App State"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Content Panels */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-pink-400" />
            <p className="text-sm font-medium">Loading Regnis Birthday Engine...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'dashboard' && <Dashboard state={state} setActiveTab={setActiveTab} onRefreshState={fetchState} />}
            {activeTab === 'excel' && <ExcelManager state={state} onRefreshState={fetchState} />}
            {activeTab === 'bulk' && <BulkMessenger state={state} onRefreshState={fetchState} />}
            {activeTab === 'template' && <TemplateEditor state={state} onRefreshState={fetchState} />}
            {activeTab === 'schedule' && <ScheduleManager state={state} onRefreshState={fetchState} />}
            {activeTab === 'api' && <ApiSettings state={state} onRefreshState={fetchState} />}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Regnis Wish SMS Engine • Text.lk Sri Lanka API Gateway</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>OAuth 2.0 & HTTP Methods Supported</span>
            <span>•</span>
            <span>RFC3339 Schedule Format</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
