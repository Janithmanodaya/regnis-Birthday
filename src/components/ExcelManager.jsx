import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, Search, Plus, Trash2, Edit, CheckCircle, AlertTriangle, UserCheck, PhoneCall, Calendar } from 'lucide-react';

export default function ExcelManager({ state, onRefreshState }) {
  const contacts = state?.contacts || [];

  // Extract unique departments & designations for autocomplete
  const existingDepartments = [...new Set(contacts.map(c => c.department).filter(Boolean))];
  const existingDesignations = [...new Set(contacts.map(c => c.designation).filter(Boolean))];

  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Contact Modal State (Add & Edit)
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    birthday: '',
    department: 'General',
    designation: 'Staff'
  });

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setUploadResult(data);
      if (onRefreshState) onRefreshState();
    } catch (err) {
      setUploadResult({ error: 'Upload failed: ' + err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (onRefreshState) onRefreshState();
    } catch (err) {
      alert('Failed to delete contact: ' + err.message);
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setContactForm({ name: '', phone: '', birthday: '', department: 'General', designation: 'Staff' });
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditId(c.id);
    setContactForm({
      name: c.name || '',
      phone: c.phone || '',
      birthday: c.birthday || '',
      department: c.department || 'General',
      designation: c.designation || 'Staff'
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editId ? `/api/contacts/${editId}` : '/api/contacts';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setShowModal(false);
        if (onRefreshState) onRefreshState();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const departments = ['ALL', ...new Set(contacts.map(c => c.department || 'General'))];

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone?.includes(searchTerm) ||
                          c.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || c.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">

      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Excel Data Import & Management</h2>
          </div>
          <p className="text-xs text-slate-400">
            Download our standard Excel template, fill in your employee details, and drag & drop the file below.
          </p>
        </div>

        <a
          href="/api/template/download"
          download
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-xl shadow-emerald-600/20 transition-all hover:scale-105 shrink-0"
        >
          <Download className="w-4 h-4" /> Download Standard Excel Template (.xlsx)
        </a>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-8 md:p-10 text-center transition-all ${
          dragActive 
            ? 'border-sky-400 bg-sky-500/10 scale-[1.01]' 
            : 'border-slate-700/80 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4 pointer-events-none">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Upload className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">
              {uploading ? 'Processing Excel File...' : 'Drag & Drop filled Excel template here'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports <span className="text-white font-semibold">.xlsx, .xls, .csv</span> files with columns: Name, Phone Number, Birthday, Department, Designation
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 bg-sky-500/10 px-4 py-2 rounded-xl border border-sky-500/20">
            Click to browse computer
          </div>
        </div>
      </div>

      {uploadResult && (
        <div className={`p-5 rounded-2xl border text-sm space-y-2 ${
          uploadResult.success 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
        }`}>
          <div className="flex items-center gap-2 font-bold text-base">
            {uploadResult.success ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
            <span>{uploadResult.success ? `Successfully imported ${uploadResult.count} contacts!` : uploadResult.error}</span>
          </div>

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="mt-2 text-xs space-y-1 bg-slate-950/60 p-3 rounded-xl border border-rose-500/20">
              <span className="font-semibold text-rose-300">Validation Alerts ({uploadResult.errors.length}):</span>
              <ul className="list-disc list-inside space-y-0.5 text-rose-300/80">
                {uploadResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Uploaded Contacts ({contacts.length})</h3>
              <p className="text-xs text-slate-400">Click the edit ✏️ icon to modify any contact record</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
              ))}
            </select>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all shadow-lg shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" /> Add Single Contact
            </button>
          </div>
        </div>

        {/* ── Mobile card view (hidden on md+) ── */}
        <div className="md:hidden space-y-3">
          {filteredContacts.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">No contacts found</div>
          ) : (
            filteredContacts.map((c, idx) => (
              <div
                key={c.id || idx}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                {/* Top row: number + name + action buttons */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white text-sm truncate">{c.name}</span>
                  </div>
                  {/* Action buttons — always visible on mobile */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(c)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition-colors text-[11px] font-semibold"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors text-[11px] font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Del
                    </button>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <PhoneCall className="w-3 h-3 opacity-70 shrink-0" />
                    <span className="font-mono truncate">{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-pink-300">
                    <Calendar className="w-3 h-3 opacity-70 shrink-0" />
                    <span className="font-mono">{c.birthday}</span>
                  </div>
                  <div className="text-slate-400 col-span-1">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                      {c.department || 'General'}
                    </span>
                  </div>
                  <div className="text-slate-500 truncate">{c.designation || 'Staff'}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop table view (hidden below md) ── */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Phone (Text.lk)</th>
                <th className="py-3.5 px-4">Birthday</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No contacts found
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                    <td className="py-3 px-4 text-emerald-400">
                      <div className="flex items-center gap-1.5 font-mono">
                        <PhoneCall className="w-3.5 h-3.5 opacity-60 shrink-0" />
                        {c.phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        {c.birthday}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {c.department || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{c.designation || 'Staff'}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                          title="Edit Contact"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-slate-700 space-y-4">
            <h3 className="text-lg font-bold text-white">{editId ? 'Edit Contact Record' : 'Add New Employee Contact'}</h3>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phone Number (e.g. 0771234567)</label>
                <input
                  type="text"
                  required
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Birthday (YYYY-MM-DD)</label>
                <input
                  type="date"
                  required
                  value={contactForm.birthday}
                  onChange={(e) => setContactForm({...contactForm, birthday: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    list="departments-list"
                    value={contactForm.department}
                    onChange={(e) => setContactForm({...contactForm, department: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                  <datalist id="departments-list">
                    {existingDepartments.map(dept => (
                      <option key={dept} value={dept.trim()} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Designation</label>
                  <input
                    type="text"
                    list="designations-list"
                    value={contactForm.designation}
                    onChange={(e) => setContactForm({...contactForm, designation: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                  <datalist id="designations-list">
                    {existingDesignations.map(desg => (
                      <option key={desg} value={desg.trim()} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/20"
                >
                  {editId ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
