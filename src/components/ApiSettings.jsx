import React, { useState } from 'react';
import { Key, Shield, Radio, Check, AlertCircle, Save, Send, Sparkles, HelpCircle } from 'lucide-react';

export default function ApiSettings({ state, onRefreshState }) {
  const currentSettings = state?.settings || {};

  const [form, setForm] = useState({
    apiToken: currentSettings.apiToken || '',
    senderId: currentSettings.senderId || 'TextLKDemo',
    authMethod: currentSettings.authMethod || 'oauth',
    sendTime: currentSettings.sendTime || '09:00',
    simulationMode: currentSettings.simulationMode !== undefined ? currentSettings.simulationMode : true,
    smsRate: currentSettings.smsRate !== undefined ? currentSettings.smsRate : 2.0
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onRefreshState) onRefreshState();
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhone) {
      alert('Please enter a phone number to test Text.lk gateway dispatch.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: testPhone,
          message: 'Hello! Regnis Birthday Gateway connection test passed successfully.'
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (onRefreshState) onRefreshState();
    } catch (err) {
      setTestResult({ status: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-bold text-white">Text.lk Gateway API Configuration</h2>
        </div>
        <p className="text-xs text-slate-400">
          Configure your Text.lk Sri Lanka SMS Gateway credentials. You can enable Simulation Mode to test all features safely.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Simulation Mode Toggle Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3 bg-gradient-to-r from-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Simulation Mode (Safe Testing)</h3>
              </div>
              <p className="text-xs text-slate-400">
                When enabled, SMS dispatches are logged and simulated locally without charging real Text.lk SMS credits.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.simulationMode}
                onChange={(e) => setForm({ ...form, simulationMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            API Credentials & Auth Method
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Text.lk API Token (Bearer Token / API Key)
              </label>
              <input
                type="password"
                value={form.apiToken}
                onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                placeholder="Paste your Text.lk API token here..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Found in your Text.lk dashboard under API settings.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sender ID / Brand Name (Max 11 Characters)
              </label>
              <input
                type="text"
                maxLength={11}
                value={form.senderId}
                onChange={(e) => setForm({ ...form, senderId: e.target.value })}
                placeholder="e.g. TextLKDemo or YourBrand"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SMS Unit Cost / Rate (LKR per SMS Part)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.smsRate}
                onChange={(e) => setForm({ ...form, smsRate: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 2.00"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used to compute real-time campaign costs for templates and bulk SMS.
              </p>
            </div>

            {/* Auth Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Authentication Protocol Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  form.authMethod === 'oauth' 
                    ? 'border-sky-500 bg-sky-500/10 text-white' 
                    : 'border-slate-800 bg-slate-950/60 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="authMethod"
                    value="oauth"
                    checked={form.authMethod === 'oauth'}
                    onChange={() => setForm({ ...form, authMethod: 'oauth' })}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-bold text-xs block text-white">OAuth 2.0 (Bearer Token - Recommended)</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">POST to https://app.text.lk/api/v3/sms/send with JSON payload</span>
                  </div>
                </label>

                <label className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  form.authMethod === 'http' 
                    ? 'border-sky-500 bg-sky-500/10 text-white' 
                    : 'border-slate-800 bg-slate-950/60 text-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="authMethod"
                    value="http"
                    checked={form.authMethod === 'http'}
                    onChange={() => setForm({ ...form, authMethod: 'http' })}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-bold text-xs block text-white">HTTP GET Token Method</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">GET to https://app.text.lk/api/http/sms/send with URL params</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveSuccess ? 'Settings Saved!' : 'Save Configuration'}
            </button>
          </div>
        </div>

      </form>

      {/* Gateway Tester Modal / Box */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-400" /> Gateway Connection Test
        </h3>
        <p className="text-xs text-slate-400">
          Enter a Sri Lankan mobile number to verify gateway authentication and message delivery.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Recipient number e.g. 0771234567"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20"
          >
            {testing ? 'Testing...' : 'Test Gateway Connection'}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 ${
            testResult.status ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-200 border border-rose-500/30'
          }`}>
            {testResult.status ? <Check className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            <div className="space-y-1">
              <p className="font-bold">{testResult.message}</p>
              {testResult.data && (
                <pre className="p-2 rounded bg-slate-950/80 font-mono text-[10px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
