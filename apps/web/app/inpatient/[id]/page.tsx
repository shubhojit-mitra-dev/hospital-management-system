'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  MapPin, 
  Plus, 
  Activity, 
  Check, 
  X, 
  AlertCircle, 
  Clock, 
  BookOpen, 
  RefreshCw,
  LogOut,
  ClipboardList
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function AdmissionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [admission, setAdmission] = useState<any>(null);
  const [wards, setWards] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('rounds'); // rounds, info, transfer, discharge

  // Add Round Note State
  const [noteType, setNoteType] = useState('DOCTOR_ROUND');
  const [notesText, setNotesText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Transfer Bed State
  const [targetWardId, setTargetWardId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Discharge Patient State
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('');
  const [dischargeCondition, setDischargeCondition] = useState('IMPROVED');
  const [dischargeInstructions, setDischargeInstructions] = useState('');
  const [discharging, setDischarging] = useState(false);

  const fetchAdmissionDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/inpatient/admissions/${id}`);
      setAdmission(res.data?.data);
      if (res.data?.data) {
        setDischargeDiagnosis(res.data.data.admissionDiagnosis || '');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch admission details.');
    } finally {
      setLoading(false);
    }
  };

  const loadWards = async () => {
    try {
      const res = await api.get('/api/v1/inpatient/availability');
      setWards(res.data?.data?.wards || []);
    } catch (err) {
      console.error('Failed to load wards', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAdmissionDetails();
      loadWards();
    }
  }, [id]);

  const handleWardChange = async (selectedId: string) => {
    setTargetWardId(selectedId);
    setTargetBedId('');
    if (!selectedId) {
      setBeds([]);
      return;
    }
    try {
      const res = await api.get(`/api/v1/inpatient/wards/${selectedId}`);
      setBeds(res.data?.data?.beds?.filter((b: any) => b.status === 'AVAILABLE') || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRoundNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesText) return;

    setAddingNote(true);
    try {
      await api.post(`/api/v1/inpatient/admissions/${id}/notes`, {
        noteType,
        notes: notesText
      });
      setNotesText('');
      fetchAdmissionDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to add round note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWardId || !targetBedId) return;

    setTransferring(true);
    try {
      await api.post(`/api/v1/inpatient/admissions/${id}/transfer`, {
        toWardId: targetWardId,
        toBedId: targetBedId,
        reason: transferReason || undefined
      });
      
      setTargetWardId('');
      setTargetBedId('');
      setTransferReason('');
      fetchAdmissionDetails();
      alert('Patient transferred successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to execute transfer');
    } finally {
      setTransferring(false);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeDiagnosis) return;

    setDischarging(true);
    try {
      await api.post(`/api/v1/inpatient/admissions/${id}/discharge`, {
        dischargeDiagnosis,
        dischargeCondition,
        dischargeInstructions: dischargeInstructions || undefined
      });
      fetchAdmissionDetails();
      alert('Patient discharged successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to authorize discharge');
    } finally {
      setDischarging(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold">Loading admission details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !admission) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
        <div className="space-y-6">
          <button onClick={() => router.push('/inpatient')} className="flex items-center gap-2 text-xs font-bold text-slate-555 hover:text-slate-800 transition">
            <ArrowLeft className="h-4 w-4" />
            Back to Inpatient Dashboard
          </button>
          <div className="p-5 bg-red-50 text-red-750 font-bold rounded-2xl border border-red-100 flex items-center gap-3 text-xs">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Admission record not found.'}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isAdmitted = admission.status === 'ADMITTED';

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
      <div className="space-y-8 font-semibold text-xs text-slate-700">
        
        {/* Navigation & Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
          <button 
            onClick={() => router.push('/inpatient')} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider',
                isAdmitted ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
              )}
            >
              {admission.status}
            </span>
          </div>
        </div>

        {/* Patient Details Profile Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4.5">
            <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-650">
              <User className="h-7 w-7" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-teal-600 tracking-wider">Admission Record</span>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight mt-0.5">
                {admission.patient?.firstName} {admission.patient?.lastName}
              </h1>
              <p className="text-slate-500 mt-1 font-bold">
                {admission.admissionNumber} | Type: <span className="text-slate-650 font-extrabold">{admission.admissionType}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-10 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Attending Doctor</span>
              <p className="font-extrabold text-slate-800 text-xs">Dr. {admission.doctor?.user?.firstName} {admission.doctor?.user?.lastName}</p>
              <p className="text-[10px] text-slate-500">{admission.doctor?.specialization}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Allocated Room</span>
              <p className="font-extrabold text-slate-800 text-xs">{admission.ward?.name}</p>
              <p className="text-[10px] text-teal-650 font-bold">Bed: {admission.bed?.bedNumber}</p>
            </div>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs Selector */}
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 print:hidden">
              {[
                { id: 'rounds', label: 'Clinical Rounds & Notes', icon: BookOpen },
                { id: 'info', label: 'Admission Context', icon: ClipboardList },
                { id: 'transfer', label: 'Bed Transfer', icon: RefreshCw, disabled: !isAdmitted },
                { id: 'discharge', label: 'Discharge', icon: LogOut }
              ].map((tab) => (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-35',
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8">
              
              {/* Tab: Rounds & Notes */}
              {activeTab === 'rounds' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Daily Treatment Log</h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Timeline view</span>
                  </div>

                  {/* Add note Form */}
                  {isAdmitted ? (
                    <form onSubmit={handleAddRoundNote} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-4 print:hidden">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Log New Note</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Note Type:</label>
                          <select
                            value={noteType}
                            onChange={(e) => setNoteType(e.target.value)}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                          >
                            <option value="DOCTOR_ROUND">Doctor Round Note</option>
                            <option value="NURSE_NOTE">Nurse Note</option>
                            <option value="PROCEDURE">Procedure log</option>
                            <option value="INCIDENT">Incident Log</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        required
                        placeholder="Log clinical status, vital updates, drug adjustments..."
                        rows={3}
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-teal-500"
                      />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={addingNote}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {addingNote ? 'Saving...' : 'Add Note to Log'}
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {/* Notes List Timeline */}
                  {(!admission.notes || admission.notes.length === 0) ? (
                    <p className="text-slate-400 italic text-[11px] text-center py-6">No round notes logged yet.</p>
                  ) : (
                    <div className="relative border-l border-slate-150 pl-5.5 space-y-6">
                      {admission.notes.map((note: any) => (
                        <div key={note.id} className="relative">
                          {/* Timeline node dot */}
                          <span className={cn(
                            'absolute -left-7 top-1 h-3 w-3 rounded-full border-2 border-white ring-4 ring-white shadow-sm block',
                            note.noteType === 'DOCTOR_ROUND' && 'bg-teal-500',
                            note.noteType === 'NURSE_NOTE' && 'bg-blue-500',
                            note.noteType === 'PROCEDURE' && 'bg-amber-500',
                            note.noteType === 'INCIDENT' && 'bg-red-500'
                          )} />
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-650">
                                {note.noteType.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {new Date(note.authoredAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-700 font-medium leading-relaxed bg-slate-50/45 p-3 rounded-xl border border-slate-100/50 mt-1.5">{note.notes}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 text-right">
                              Logged by: {note.author?.firstName} {note.author?.lastName} ({note.author?.role})
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* Tab: Context Details */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Admission Overview</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chief Complaint</span>
                      <p className="text-slate-800 text-xs font-bold leading-relaxed">{admission.chiefComplaint || 'None declared'}</p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Initial Diagnosis</span>
                      <p className="text-slate-800 text-xs font-bold leading-relaxed">{admission.admissionDiagnosis || 'None declared'}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Companion / Emergency Attendant</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-450 font-bold block uppercase tracking-wider">Attendant Name</span>
                        <p className="text-slate-700 font-bold">{admission.attendantName || 'N/A'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-450 font-bold block uppercase tracking-wider">Contact Phone</span>
                        <p className="text-slate-700 font-bold">{admission.attendantPhone || 'N/A'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-450 font-bold block uppercase tracking-wider">Relationship</span>
                        <p className="text-slate-700 font-bold">{admission.attendantRelation || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Transfer Room Bed */}
              {activeTab === 'transfer' && isAdmitted && (
                <form onSubmit={handleTransfer} className="space-y-6 font-semibold text-xs text-slate-700">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Re-allocate Bed / Room</h3>
                  
                  <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-2xl space-y-1">
                    <p className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Current Allocation Rate</p>
                    <p className="text-slate-850 font-extrabold text-[12px]">{admission.ward?.name} (Bed: {admission.bed?.bedNumber})</p>
                    <p className="text-teal-700 text-xs font-bold mt-1">₹{Number(admission.dailyRoomRate).toLocaleString('en-IN')}/day</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-650 mb-1.5">Destination Ward *</label>
                      <select
                        required
                        value={targetWardId}
                        onChange={(e) => handleWardChange(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                      >
                        <option value="">-- Choose Ward --</option>
                        {wards.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.wardType} - ₹{Number(w.chargePerDay).toLocaleString('en-IN')}/day)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-650 mb-1.5">Destination AVAILABLE Bed *</label>
                      <select
                        required
                        value={targetBedId}
                        onChange={(e) => setTargetBedId(e.target.value)}
                        disabled={!targetWardId}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500 disabled:opacity-50"
                      >
                        <option value="">-- Choose Bed --</option>
                        {beds.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bedNumber} ({b.bedType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Transfer Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Critical condition requiring ICU care, patient upgrade request"
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={transferring}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {transferring ? 'Processing...' : 'Confirm Transfer'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab: Discharge Summary Form */}
              {activeTab === 'discharge' && (
                <div className="space-y-6 font-semibold text-xs text-slate-700">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Discharge Summary</h3>
                  
                  {isAdmitted ? (
                    <form onSubmit={handleDischarge} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-650 mb-1.5">Discharge Diagnosis *</label>
                          <input
                            type="text"
                            required
                            placeholder="Final clinical diagnosis description..."
                            value={dischargeDiagnosis}
                            onChange={(e) => setDischargeDiagnosis(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-650 mb-1.5">Discharge Condition *</label>
                          <select
                            value={dischargeCondition}
                            onChange={(e) => setDischargeCondition(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                          >
                            <option value="RECOVERED">Recovered</option>
                            <option value="IMPROVED">Improved</option>
                            <option value="REFERRED">Referred</option>
                            <option value="AGAINST_ADVICE">Against Medical Advice</option>
                            <option value="DEATH">Death</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-650 mb-1.5">Discharge Instructions</label>
                        <textarea
                          rows={4}
                          placeholder="Instructions: medications, bed rest warnings, follow-up dates..."
                          value={dischargeInstructions}
                          onChange={(e) => setDischargeInstructions(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          type="submit"
                          disabled={discharging}
                          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {discharging ? 'Processing Discharge...' : 'Authorize Discharge'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    // Print summary details if already discharged
                    <div className="space-y-6">
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-850 text-[11px] leading-relaxed">
                        <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold">Patient Discharged</p>
                          <p className="font-semibold text-emerald-650">Discharge details and summaries are finalized. Patient record is archived.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Date of Discharge</span>
                          <p className="text-slate-800 font-bold">{new Date(admission.dischargeDate).toLocaleString()}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Discharge Condition</span>
                          <p className="text-slate-800 font-bold">{admission.dischargeCondition}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-100 pt-5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Final Discharge Diagnosis</span>
                        <p className="text-slate-800 text-xs font-extrabold leading-relaxed">{admission.dischargeDiagnosis}</p>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-100 pt-5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Instructions Provided</span>
                        <p className="text-slate-600 text-xs leading-relaxed font-semibold">{admission.dischargeInstructions || 'No custom instructions provided.'}</p>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

          {/* Right sidebar: Transfer log / Admission Details (1 Col) */}
          <div className="space-y-6">
            
            {/* Quick overview widget */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 font-semibold text-xs text-slate-700">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">stay overview</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/50">
                  <span className="text-slate-450 font-bold">DATE ADMITTED</span>
                  <span className="text-slate-755 font-bold">{new Date(admission.admissionDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/50">
                  <span className="text-slate-450 font-bold">ROOM RATE snap</span>
                  <span className="text-slate-755 font-bold">₹{Number(admission.dailyRoomRate).toLocaleString('en-IN')}/day</span>
                </div>
                {admission.dischargeDate && (
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/50">
                    <span className="text-slate-450 font-bold">DISCHARGE DATE</span>
                    <span className="text-slate-755 font-bold">{new Date(admission.dischargeDate).toLocaleDateString()}</span>
                  </div>
                )}
                {admission.primaryNurse && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-450 font-bold">NURSE IN CHARGE</span>
                    <span className="text-slate-755 font-bold">{admission.primaryNurse.firstName} {admission.primaryNurse.lastName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bed Transfers audit log */}
            {admission.transfers && admission.transfers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4 font-semibold text-xs text-slate-700">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Bed Transfer History</h3>
                <div className="space-y-4">
                  {admission.transfers.map((trn: any) => (
                    <div key={trn.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl relative">
                      <p className="font-extrabold text-slate-800 text-[11px] leading-tight flex items-center gap-1">
                        {trn.fromWard?.name || 'Old Ward'}
                        <span>→</span>
                        {trn.toWard?.name || 'New Ward'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold">Reason: {trn.reason}</p>
                      <p className="text-[9px] text-slate-350 mt-1">Date: {new Date(trn.transferredAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
