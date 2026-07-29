import React, { useState, useRef } from 'react';
import { Sparkles, GripVertical, Check, Eye, User, Save, RefreshCw, AlertCircle, MessageSquare } from 'lucide-react';

const FIELD_TOKENS = [
  { label: 'Name', token: '<<Name>>', color: 'bg-pink-500/10 text-pink-300 border-pink-500/30' },
  { label: 'Phone Number', token: '<<Phone Number>>', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { label: 'Birthday', token: '<<Birthday>>', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  { label: 'Department', token: '<<Department>>', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  { label: 'Designation', token: '<<Designation>>', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' }
];

const PRESETS = [
  {
    name: 'Celebratory & Warm (Default)',
    text: "🎉 Warm Birthday Wishes! Dear <<Name>>, wishing you a very Happy Birthday from all of us at <<Department>>! May your year ahead be filled with success, health, and happiness. 🎂✨"
  },
  {
    name: 'Corporate & Professional',
    text: "Dear <<Name>>, the management and team at <<Department>> wish you a wonderful Happy Birthday! Thank you for your continued dedication as our <<Designation>>."
  },
  {
    name: 'Friendly & Joyful',
    text: "Happy Birthday <<Name>>! 🥳 Wishing you an incredible day filled with laughter and joy. Cheers to another great year together in <<Department>>! 🎉"
  },
  {
    name: 'Short & Direct',
    text: "Happy Birthday <<Name>>! Best wishes from the <<Department>> team on your special day. Have a great one! 🎂"
  }
];

export default function TemplateEditor({ state, onRefreshState }) {
  const contacts = state?.contacts || [];
  const currentTemplate = state?.wishTemplate || PRESETS[0].text;

  const [templateText, setTemplateText] = useState(currentTemplate);
  const [selectedContactId, setSelectedContactId] = useState(contacts[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dragOverTextarea, setDragOverTextarea] = useState(false);

  const textareaRef = useRef(null);

  // Insert token at cursor position or end
  const insertToken = (token) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = templateText.substring(0, start);
    const after = templateText.substring(end);

    const updated = before + token + after;
    setTemplateText(updated);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  // Drag & Drop handlers for tokens
  const handleDragStart = (e, token) => {
    e.dataTransfer.setData('text/plain', token);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverTextarea(true);
  };

  const handleDragLeave = () => {
    setDragOverTextarea(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOverTextarea(false);
    const token = e.dataTransfer.getData('text/plain');
    if (token) {
      insertToken(token);
    }
  };

  // Save wish template to server
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishTemplate: templateText })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onRefreshState) onRefreshState();
    } catch (err) {
      alert('Failed to save wish template: ' + err.message);
    } fontMethod: setSaving(false);
  };

  // Selected contact for real-time live preview
  const previewContact = contacts.find(c => c.id === selectedContactId) || contacts[0] || {
    name: 'Sample Employee',
    phone: '94771234567',
    birthday: '1995-08-15',
    department: 'Engineering',
    designation: 'Software Developer'
  };

  // Render template placeholders with sample values
  const renderedPreview = templateText
    .replace(/<<\s*Name\s*>>/gi, previewContact.name || 'Sample Employee')
    .replace(/<<\s*Phone Number\s*>>/gi, previewContact.phone || '94771234567')
    .replace(/<<\s*Birthday\s*>>/gi, previewContact.birthday || '1995-08-15')
    .replace(/<<\s*Department\s*>>/gi, previewContact.department || 'Engineering')
    .replace(/<<\s*Designation\s*>>/gi, previewContact.designation || 'Software Developer');

  const isUnicode = (text) => {
    const gsm7Regexp = /^[A-Za-z0-9\s!"#\$%&'\(\)\*\+\,\-\.\/:;<=>\?@\[\\\]\^_`\{\|\}\~¡£¤¥§¿ÄÅÆÇÉÑÖØÜßàäåæçèéìíñòóùúüòöøùü]*$/;
    return !gsm7Regexp.test(text);
  };

  const getSmsCount = (text) => {
    if (!text) return 0;
    const unicode = isUnicode(text);
    const len = text.length;
    if (unicode) {
      return len <= 70 ? 1 : Math.ceil(len / 67);
    } else {
      return len <= 160 ? 1 : Math.ceil(len / 153);
    }
  };

  const smsRate = state?.settings?.smsRate !== undefined ? state.settings.smsRate : 2.0;
  const isMsgUnicode = isUnicode(templateText);
  const smsCount = getSmsCount(templateText);
  const estimatedCost = templateText.trim() ? (smsCount * smsRate) : 0;

  const charLength = templateText.length;

  return (
    <div className="space-y-6">

      {/* Title & Drag instructions */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-400" />
          <h2 className="text-xl font-bold text-white">Visual Drag & Drop Wish Template Editor</h2>
        </div>
        <p className="text-xs text-slate-400">
          Design your custom birthday message. Drag tokens from the sidebar directly into the message text area or click any token to insert at cursor position.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Field Tokens & Editor */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Drag & Drop Field Tokens Sidebar */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Drag & Drop Available Excel Fields:
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {FIELD_TOKENS.map((item) => (
                <div
                  key={item.token}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.token)}
                  onClick={() => insertToken(item.token)}
                  className={`token-chip px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm hover:scale-105 ${item.color}`}
                  title="Drag or click to insert token"
                >
                  <GripVertical className="w-3.5 h-3.5 opacity-60" />
                  <span>{item.token}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold mr-1">Quick Presets:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setTemplateText(p.text)}
                className="px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Main Textarea Drop Zone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                Message Body (Supports <span className="text-pink-400 font-mono">&lt;&lt;Tokens&gt;&gt;</span>)
              </label>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400 font-mono">Length: <strong className="text-white">{charLength}</strong> chars ({isMsgUnicode ? 'Unicode' : 'GSM-7'})</span>
                <span className="text-slate-400 font-mono">Rate: <strong className="text-slate-300">LKR {smsRate.toFixed(2)}</strong></span>
                <span className={`font-semibold px-2 py-0.5 rounded-md ${smsCount > 1 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                  {smsCount} SMS (LKR {estimatedCost.toFixed(2)})
                </span>
              </div>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                rows={6}
                placeholder="Type your wish message or drag <<Name>> field tokens here..."
                className={`w-full p-4 rounded-2xl bg-slate-950 border text-slate-100 placeholder-slate-600 text-sm font-sans leading-relaxed focus:outline-none transition-all ${
                  dragOverTextarea 
                    ? 'border-pink-500 ring-2 ring-pink-500/30 bg-pink-500/5' 
                    : 'border-slate-700 focus:border-pink-500'
                }`}
              />
              {dragOverTextarea && (
                <div className="absolute inset-0 rounded-2xl bg-pink-500/10 border-2 border-dashed border-pink-400 pointer-events-none flex items-center justify-center text-pink-300 font-bold text-sm">
                  Drop token to insert into template!
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setTemplateText(currentTemplate)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Changes
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm shadow-lg shadow-pink-600/20 transition-all flex items-center gap-2"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" /> Template Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Wish Template
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Real-time Live Preview */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <h3 className="text-base font-bold text-white">Real-Time SMS Preview</h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Sri Lanka Phone
            </span>
          </div>

          {/* Sample Recipient Selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Preview with Contact:
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
            >
              {contacts.length === 0 ? (
                <option value="">Sample Employee (No Uploaded Contacts)</option>
              ) : (
                contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.department || 'General'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Phone Screen Mockup */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2 text-xs">
                <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                <span className="font-semibold text-slate-300">To: {previewContact.phone || '94771234567'}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Sender: TextLKDemo</span>
            </div>

            {/* Message Bubble */}
            <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-xs text-slate-100 font-sans leading-relaxed shadow-inner space-y-2">
              <p 
                className="whitespace-pre-wrap"
                style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                {renderedPreview}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>{isUnicode(renderedPreview) ? 'Unicode Message' : 'Standard SMS'}</span>
              <span>
                Parts: <strong className="text-slate-300">{getSmsCount(renderedPreview)}</strong> ({renderedPreview.length} chars) 
                &middot; Cost: <strong className="text-slate-300">LKR {templateText.trim() ? (getSmsCount(renderedPreview) * smsRate).toFixed(2) : '0.00'}</strong>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300">Recipient Details:</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>Name: <span className="text-slate-200">{previewContact.name}</span></div>
              <div>Dept: <span className="text-slate-200">{previewContact.department}</span></div>
              <div>Phone: <span className="text-slate-200">{previewContact.phone}</span></div>
              <div>Birthday: <span className="text-slate-200">{previewContact.birthday}</span></div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
