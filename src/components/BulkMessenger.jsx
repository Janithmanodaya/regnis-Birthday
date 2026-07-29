import React, { useState, useEffect } from 'react';
import { 
  SendHorizontal, Users, ListPlus, Trash2, Edit, CheckCircle2, 
  AlertTriangle, MessageSquare, Info, X, Check, Search, Filter, HelpCircle
} from 'lucide-react';

export default function BulkMessenger({ state, onRefreshState }) {
  const contacts = state?.contacts || [];
  const customLists = state?.customLists || [];
  const settings = state?.settings || {};

  // Form State
  const [targetType, setTargetType] = useState('all'); // 'all', 'department', 'list'
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [message, setMessage] = useState('');
  
  // Custom Lists Manager State
  const [showListModal, setShowListModal] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [listForm, setListForm] = useState({
    name: '',
    description: '',
    contactIds: []
  });
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listDeptFilter, setListDeptFilter] = useState('ALL');

  // Sending State
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // Initialize selected values if empty
  const departments = [...new Set(contacts.map(c => c.department).filter(Boolean))];
  
  useEffect(() => {
    if (departments.length > 0 && !selectedDepartment) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments, selectedDepartment]);

  useEffect(() => {
    if (customLists.length > 0 && !selectedListId) {
      setSelectedListId(customLists[0].id);
    }
  }, [customLists, selectedListId]);

  // Determine current active recipients
  const getActiveRecipients = () => {
    if (targetType === 'all') {
      return contacts;
    }
    if (targetType === 'department') {
      return contacts.filter(c => c.department === selectedDepartment);
    }
    if (targetType === 'list') {
      const activeList = customLists.find(l => l.id === selectedListId);
      if (!activeList) return [];
      return contacts.filter(c => activeList.contactIds.includes(c.id));
    }
    return [];
  };

  const activeRecipients = getActiveRecipients();

  const isUnicode = (text) => {
    const gsm7Regexp = /^[A-Za-z0-9\s!"#\$%&'\(\)\*\+\,\-\.\/:;<=>\?@\[\\\]\^_`\{\|\}\~¡£¤¥§¿ÄÅÆÇÉÑÖØÜßàäåæçèéìíñòóùúüòöøùü]*$/;
    return !gsm7Regexp.test(text);
  };

  // Character counting logic
  const getSmsPartsCount = (text) => {
    if (!text) return { chars: 0, parts: 0, unicode: false };
    const chars = text.length;
    const unicode = isUnicode(text);
    let parts = 0;
    if (unicode) {
      parts = chars <= 70 ? 1 : Math.ceil(chars / 67);
    } else {
      parts = chars <= 160 ? 1 : Math.ceil(chars / 153);
    }
    return { chars, parts, unicode };
  };

  const { chars: charCount, parts: partsCount, unicode: isMsgUnicode } = getSmsPartsCount(message);

  // Handle Quick Insert tags
  const insertTag = (tag) => {
    setMessage(prev => prev + ` <<${tag}>>`);
  };

  // Preview rendered message with first contact details
  const getPreviewText = () => {
    if (!message) return "Your message preview will appear here...";
    const sampleContact = activeRecipients[0] || {
      name: "Kasun Rajitha",
      department: "Information Technology",
      designation: "Software Engineer",
      phone: "94771234567",
      birthday: "1995-08-15"
    };

    let preview = message;
    const fields = {
      'Name': sampleContact.name,
      'name': sampleContact.name,
      'Phone Number': sampleContact.phone,
      'phone': sampleContact.phone,
      'Birthday': sampleContact.birthday || 'YYYY-MM-DD',
      'Department': sampleContact.department || 'General',
      'Designation': sampleContact.designation || 'Staff'
    };

    Object.keys(fields).forEach(key => {
      const val = fields[key];
      const regexes = [
        new RegExp(`<<\\s*${key}\\s*>>`, 'gi'),
        new RegExp(`{{\\s*${key}\\s*}}`, 'gi'),
        new RegExp(`{\\s*${key}\\s*}`, 'gi')
      ];
      regexes.forEach(r => {
        preview = preview.replace(r, val);
      });
    });

    return preview;
  };

  const previewText = getPreviewText();
  const { parts: previewParts, unicode: isPreviewUnicode } = getSmsPartsCount(previewText);
  const smsRate = settings.smsRate !== undefined ? settings.smsRate : 2.0;
  const estimatedUnitCost = message.trim() ? (previewParts * smsRate) : 0;
  const estimatedTotalCost = message.trim() ? (estimatedUnitCost * activeRecipients.length) : 0;

  // Save list
  const handleSaveList = async (e) => {
    e.preventDefault();
    if (!listForm.name.trim()) {
      alert("List name is required");
      return;
    }

    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingList?.id || undefined,
          name: listForm.name,
          description: listForm.description,
          contactIds: listForm.contactIds
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowListModal(false);
        setEditingList(null);
        if (onRefreshState) onRefreshState();
      } else {
        alert(data.error || "Failed to save list");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Delete list
  const handleDeleteList = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the list "${name}"?`)) return;
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (onRefreshState) onRefreshState();
        if (selectedListId === id) {
          setSelectedListId(customLists.filter(l => l.id !== id)[0]?.id || '');
        }
      }
    } catch (err) {
      alert("Failed to delete list: " + err.message);
    }
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingList(null);
    setListForm({ name: '', description: '', contactIds: [] });
    setListSearchQuery('');
    setListDeptFilter('ALL');
    setShowListModal(true);
  };

  // Open edit modal
  const openEditModal = (list) => {
    setEditingList(list);
    setListForm({
      name: list.name,
      description: list.description,
      contactIds: list.contactIds
    });
    setListSearchQuery('');
    setListDeptFilter('ALL');
    setShowListModal(true);
  };

  // Toggle contact selection in list form
  const toggleContactInList = (contactId) => {
    setListForm(prev => {
      const exists = prev.contactIds.includes(contactId);
      const newIds = exists 
        ? prev.contactIds.filter(id => id !== contactId)
        : [...prev.contactIds, contactId];
      return { ...prev, contactIds: newIds };
    });
  };

  // Select all filtered contacts in list builder
  const handleSelectAllFiltered = (filteredList) => {
    const filteredIds = filteredList.map(c => c.id);
    setListForm(prev => {
      // Check if all filtered are already selected
      const allSelected = filteredIds.every(id => prev.contactIds.includes(id));
      let newIds;
      if (allSelected) {
        // Deselect all filtered
        newIds = prev.contactIds.filter(id => !filteredIds.includes(id));
      } else {
        // Add any missing filtered IDs
        newIds = [...new Set([...prev.contactIds, ...filteredIds])];
      }
      return { ...prev, contactIds: newIds };
    });
  };

  // Bulk Send Handler
  const handleSendBulk = async (e) => {
    e.preventDefault();
    if (activeRecipients.length === 0) {
      alert("No recipients selected!");
      return;
    }
    if (!message.trim()) {
      alert("Please write a message content!");
      return;
    }

    const confirmMsg = `Are you sure you want to broadcast this message to ${activeRecipients.length} recipients?\n` +
      `Mode: ${settings.simulationMode ? 'SIMULATION (no actual SMS will be charged/sent)' : 'LIVE GATEWAY'}`;

    if (!confirm(confirmMsg)) return;

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: activeRecipients,
          message: message
        })
      });
      const data = await res.json();
      setSendResult(data);
      if (onRefreshState) onRefreshState();
    } catch (err) {
      setSendResult({ success: false, error: err.message });
    } finally {
      setIsSending(false);
    }
  };

  // Filter contacts in the modal builder
  const filteredModalContacts = contacts.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(listSearchQuery.toLowerCase()) || 
                          c.phone?.includes(listSearchQuery) ||
                          c.designation?.toLowerCase().includes(listSearchQuery.toLowerCase());
    const matchesDept = listDeptFilter === 'ALL' || c.department === listDeptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SendHorizontal className="w-5 h-5 text-pink-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white font-sans">Bulk Messaging Campaign</h2>
          </div>
          <p className="text-xs text-slate-400">
            Broadcast personalized bulk messages immediately to teams, custom user groups, or the entire organization.
          </p>
        </div>
      </div>

      {/* Main Feature Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Campaign Setup & Composer (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          
          <form onSubmit={handleSendBulk} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
            
            {/* Target Audience selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">
                1. Select Target Recipients
              </label>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                    targetType === 'all'
                      ? 'bg-pink-500/10 border-pink-500/50 text-white shadow-lg shadow-pink-500/5'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Users className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold">All Contacts</span>
                  <span className="text-[10px] opacity-75">({contacts.length} total)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('department')}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                    targetType === 'department'
                      ? 'bg-pink-500/10 border-pink-500/50 text-white shadow-lg shadow-pink-500/5'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Filter className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold">By Department</span>
                  <span className="text-[10px] opacity-75">({departments.length} depts)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('list')}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                    targetType === 'list'
                      ? 'bg-pink-500/10 border-pink-500/50 text-white shadow-lg shadow-pink-500/5'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <ListPlus className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold">Custom Saved List</span>
                  <span className="text-[10px] opacity-75">({customLists.length} lists)</span>
                </button>
              </div>

              {/* Dynamic Select Dropdowns based on choice */}
              {targetType === 'department' && (
                <div className="pt-2">
                  <label className="block text-xs text-slate-400 mb-1">Select Department</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-pink-500"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'list' && (
                <div className="pt-2">
                  <label className="block text-xs text-slate-400 mb-1">Select Custom List</label>
                  {customLists.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-amber-400">
                      No custom lists created yet. Create one on the right panel first!
                    </div>
                  ) : (
                    <select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-pink-500"
                    >
                      {customLists.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.contactIds.length} members)</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Active recipients counter badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 text-xs text-slate-300 border border-slate-800/80">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                  <span>Targeting: <strong className="text-white">{activeRecipients.length}</strong> recipients</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 text-xs text-slate-300 border border-slate-800/80">
                  <span>Est. Cost: <strong className="text-white">LKR {estimatedTotalCost.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            {/* Message composer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-200">
                  2. Compose Message
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Insert Tag:</span>
                  {['Name', 'Department', 'Designation'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertTag(tag)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-pink-400 border border-slate-700 transition-colors"
                    >
                      &lt;&lt;{tag}&gt;&gt;
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your broadcast message here..."
                rows={5}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pink-500 font-sans leading-relaxed"
                required
              />

              {/* Character and page indicators */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Standard GSM 160 limit, Unicode 70 limit.</span>
                </div>
                <div>
                  <span className="font-mono text-slate-300">{charCount}</span> chars ({isMsgUnicode ? 'Unicode' : 'GSM-7'}) /{' '}
                  <span className="font-semibold text-pink-400">{previewParts}</span> SMS page{previewParts > 1 ? 's' : ''} &middot;{' '}
                  <span className="text-slate-300 font-semibold">LKR {smsRate.toFixed(2)}</span> / part
                </div>
              </div>
            </div>

            {/* Live SMS Preview Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                  <span>Live Sample Preview</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {isPreviewUnicode ? 'Unicode Message' : 'Standard SMS'}
                </span>
              </div>
              <p 
                className="text-sm text-slate-300 italic whitespace-pre-line leading-relaxed"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                "{previewText}"
              </p>
              <div className="text-right text-[10px] text-slate-500 pt-1 border-t border-slate-900/60">
                Preview Cost: <strong className="text-slate-300">LKR {estimatedUnitCost.toFixed(2)}</strong> ({previewParts} parts, {previewText.length} chars)
              </div>
            </div>

            {/* Dispatch Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-900">
              <div className="text-xs text-slate-500">
                Sends via {settings.authMethod === 'http' ? 'Text.lk HTTP URL' : 'Text.lk OAuth 2.0 API'}
              </div>

              <button
                type="submit"
                disabled={isSending || activeRecipients.length === 0}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-pink-600/10 transition-all hover:scale-105"
              >
                {isSending ? 'Sending Bulk Broadcast...' : 'Launch Broadcast Campaign'}
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>

          </form>

          {/* Results Summary Box */}
          {sendResult && (
            <div className={`p-6 rounded-3xl border space-y-4 ${
              sendResult.success 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' 
                : 'bg-rose-500/5 border-rose-500/20 text-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {sendResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  )}
                  <h3 className="font-bold text-white text-base">
                    {sendResult.success ? 'Broadcast Finished Successfully' : 'Campaign Failed'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSendResult(null)}
                  className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {sendResult.results && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Dispatched <strong className="text-white">{sendResult.results.filter(r => r.status === 'Sent').length}</strong> successful messages out of {sendResult.results.length} total recipients.
                  </p>
                  
                  {/* Results Mini-table */}
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Gateway Msg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {sendResult.results.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-900/20">
                            <td className="py-2 px-3 font-semibold text-white">{r.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{r.phone}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'Sent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 italic truncate max-w-xs">{r.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {sendResult.error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-mono">
                  {sendResult.error}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Custom Saved Lists Manager */}
        <div className="space-y-6">
          
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">Custom Saved Lists</h3>
              </div>
              
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/20 font-bold text-[11px] transition-colors"
              >
                <ListPlus className="w-3.5 h-3.5" />
                New List
              </button>
            </div>

            {customLists.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-2">
                <ListPlus className="w-7 h-7 text-slate-700 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">No Custom Lists Saved</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Create a custom group of employees (e.g. "Operations Team" or "Branch managers") for fast bulk messaging.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customLists.map((list) => (
                  <div 
                    key={list.id} 
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-start justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{list.name}</h4>
                      {list.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">{list.description}</p>
                      )}
                      <span className="inline-block text-[10px] font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 text-purple-400 mt-1">
                        {list.contactIds?.length || 0} members
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(list)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title="Edit List"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id, list.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete List"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── LIST BUILDER / MODAL DIALOG ── */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 border border-slate-700 flex flex-col max-h-[85vh] space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingList ? 'Modify Custom List' : 'Create Custom Recipient List'}
                </h3>
                <p className="text-xs text-slate-400">Name your group and choose which employees belong to it.</p>
              </div>
              <button 
                onClick={() => { setShowListModal(false); setEditingList(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <form onSubmit={handleSaveList} className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">List Name</label>
                  <input
                    type="text"
                    required
                    value={listForm.name}
                    onChange={(e) => setListForm({...listForm, name: e.target.value})}
                    placeholder="e.g. Senior Executives"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={listForm.description}
                    onChange={(e) => setListForm({...listForm, description: e.target.value})}
                    placeholder="e.g. HR & Management staff"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-850 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Selection Section */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="block text-xs font-bold text-slate-300">
                    Select Contacts ({listForm.contactIds.length} chosen)
                  </label>

                  {/* Filters inside Modal */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-44">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={listSearchQuery}
                        onChange={(e) => setListSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-[11px] focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <select
                      value={listDeptFilter}
                      onChange={(e) => setListDeptFilter(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-[11px] focus:outline-none focus:border-sky-500"
                    >
                      <option value="ALL">All Departments</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contacts grid selection table */}
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40 max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-805 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-10">
                          <input
                            type="checkbox"
                            checked={filteredModalContacts.length > 0 && filteredModalContacts.every(c => listForm.contactIds.includes(c.id))}
                            onChange={() => handleSelectAllFiltered(filteredModalContacts)}
                            className="rounded border-slate-800 text-pink-600 focus:ring-pink-500 bg-slate-950 w-3.5 h-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Designation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {filteredModalContacts.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-6 text-center text-slate-500">
                            No matching contacts found
                          </td>
                        </tr>
                      ) : (
                        filteredModalContacts.map(c => {
                          const isSelected = listForm.contactIds.includes(c.id);
                          return (
                            <tr 
                              key={c.id} 
                              onClick={() => toggleContactInList(c.id)}
                              className={`hover:bg-slate-900/60 cursor-pointer transition-colors ${
                                isSelected ? 'bg-pink-500/5' : ''
                              }`}
                            >
                              <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleContactInList(c.id)}
                                  className="rounded border-slate-800 text-pink-600 focus:ring-pink-500 bg-slate-950 w-3.5 h-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-bold text-white">{c.name}</td>
                              <td className="py-2 px-3 font-mono text-slate-400">{c.phone}</td>
                              <td className="py-2 px-3">
                                <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                                  {c.department}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-500">{c.designation}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Actions inside Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowListModal(false); setEditingList(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20"
                >
                  {editingList ? 'Save Changes' : 'Create Custom List'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
