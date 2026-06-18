'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Activity, 
  Clock, 
  Plus, 
  Check, 
  X, 
  AlertTriangle,
  ClipboardList,
  Phone,
  Heart,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function EmergencyCaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [caseDetail, setCaseDetail] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Log action state
  const [actionType, setActionType] = useState('MEDICATION');
  const [actionDesc, setActionDesc] = useState('');
  const [loggingAction, setLoggingAction] = useState(false);

  // Assign staff state
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [assigningStaff, setAssigningStaff] = useState(false);

  // Close case state
  const [disposition, setDisposition] = useState('DISCHARGED'); // DISCHARGED, ADMITTED, DECEASED
  const [closeNotes, setCloseNotes] = useState('');
  const [closingCase, setClosingCase] = useState(false);

  // Inpatient admission during close (optional)
  const [inpatientWardId, setInpatientWardId] = useState('');
  const [inpatientBedId, setInpatientBedId] = useState('');
  const [loadingBeds, setLoadingBeds] = useState(false);

  const fetchCaseDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/v1/emergency/${id}`);
      const c = res.data?.data;
      setCaseDetail(c);
      if (c) {
        setSelectedDoctorId(c.attendingDoctorId || '');
        setSelectedNurseId(c.assignedNurseId || '');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch emergency case details.');
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [docRes, staffRes, wardRes] = await Promise.all([
        api.get('/api/v1/doctors'),
        api.get('/api/v1/staff'),
        api.get('/api/v1/inpatient/availability')
      ]);
      setDoctors(docRes.data?.data || docRes.data?.doctors || []);
      
      const staffList = staffRes.data?.data || staffRes.data?.staff || [];
      setNurses(staffList.filter((s: any) => s.role === 'NURSE' || s.user?.role === 'NURSE'));
      setWards(wardRes.data?.data?.wards || []);
    } catch (err) {
      console.error('Failed to load lookups', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCaseDetails();
      loadLookups();
    }
  }, [id]);

  const handleWardChange = async (selectedId: string) => {
    setInpatientWardId(selectedId);
    setInpatientBedId('');
    if (!selectedId) {
      setBeds([]);
      return;
    }
    setLoadingBeds(true);
    try {
      const res = await api.get(`/api/v1/inpatient/wards/${selectedId}`);
      setBeds(res.data?.data?.beds?.filter((b: any) => b.status === 'AVAILABLE') || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssigningStaff(true);
    try {
      await api.patch(`/api/v1/emergency/${id}/assign`, {
        attendingDoctorId: selectedDoctorId || null,
        assignedNurseId: selectedNurseId || null
      });
      fetchCaseDetails();
      alert('Duty staff assigned successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to assign staff');
    } finally {
      setAssigningStaff(false);
    }
  };

  const handleLogAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDesc) return;

    setLoggingAction(true);
    try {
      await api.post(`/api/v1/emergency/${id}/actions`, {
        actionType,
        description: actionDesc
      });
      setActionDesc('');
      fetchCaseDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to log action');
    } finally {
      setLoggingAction(false);
    }
  };

  const handleCloseCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disposition === 'ADMITTED' && (!inpatientWardId || !inpatientBedId)) {
      alert('Please select a ward and available bed for inpatient admission.');
      return;
    }

    setClosingCase(true);
    try {
      let admissionId = undefined;

      // 1. If ADMITTED, register inpatient stay first
      if (disposition === 'ADMITTED' && caseDetail.patientId) {
        const admissionPayload = {
          patientId: caseDetail.patientId,
          doctorId: caseDetail.attendingDoctorId || doctors[0]?.id,
          departmentId: caseDetail.patient?.hospitalId ? 'dept_default' : 'dept_01', // fallback
          wardId: inpatientWardId,
          bedId: inpatientBedId,
          admissionType: 'EMERGENCY',
          chiefComplaint: `Admitted from Emergency: ${caseDetail.chiefComplaint}`,
          admissionDiagnosis: caseDetail.mechanismOfInjury || caseDetail.chiefComplaint
        };
        
        // Find default department from doctor
        const currentDoctor = doctors.find((d: any) => d.userId === caseDetail.attendingDoctorId || d.id === caseDetail.attendingDoctorId);
        if (currentDoctor) {
          admissionPayload.departmentId = currentDoctor.departmentId;
          admissionPayload.doctorId = currentDoctor.id;
        }

        const admitRes = await api.post('/api/v1/inpatient/admissions', admissionPayload);
        if (admitRes.data?.success) {
          admissionId = admitRes.data.data.id;
        }
      }

      // 2. Close case
      await api.post(`/api/v1/emergency/${id}/close`, {
        disposition,
        admissionId,
        notes: closeNotes || undefined
      });

      fetchCaseDetails();
      alert('Emergency case closed and archived!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to close emergency case');
    } finally {
      setClosingCase(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold">Loading emergency case...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !caseDetail) {
    return (
      <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']}>
        <div className="space-y-6">
          <button onClick={() => router.push('/emergency')} className="flex items-center gap-2 text-xs font-bold text-slate-555 hover:text-slate-800 transition">
            <ArrowLeft className="h-4 w-4" />
            Back to Emergency Board
          </button>
          <div className="p-5 bg-red-50 text-red-750 font-bold rounded-2xl border border-red-100 flex items-center gap-3 text-xs">
            <AlertTriangle className="h-5 w-5" />
            <span>{error || 'Emergency case not found.'}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = caseDetail.status === 'ACTIVE';
  
  // Format symptoms list
  let symptomsList: string[] = [];
  try {
    symptomsList = JSON.parse(caseDetail.symptoms || '[]');
  } catch (err) {
    symptomsList = caseDetail.symptoms ? String(caseDetail.symptoms).split(',') : [];
  }

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']}>
      <div className="space-y-8 font-semibold text-xs text-slate-700">
        
        {/* Navigation & Header status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
          <button 
            onClick={() => router.push('/emergency')} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back to Triage Board
          </button>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border',
                isActive ? 'bg-red-100 border-red-200 text-red-800 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-650'
              )}
            >
              {caseDetail.status} Case
            </span>
          </div>
        </div>

        {/* Case Profile Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4.5">
            <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-bold text-red-600 tracking-wider">Emergency Intake</span>
                <span className={cn(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase',
                  caseDetail.triageLevel === 'IMMEDIATE' && 'bg-red-100 text-red-800',
                  caseDetail.triageLevel === 'EMERGENT' && 'bg-orange-100 text-orange-800',
                  caseDetail.triageLevel === 'URGENT' && 'bg-amber-100 text-amber-800',
                  caseDetail.triageLevel === 'LESS_URGENT' && 'bg-emerald-100 text-emerald-800',
                  caseDetail.triageLevel === 'NON_URGENT' && 'bg-blue-100 text-blue-800'
                )}>
                  {caseDetail.triageLevel}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight mt-0.5">
                {caseDetail.patientName || `${caseDetail.patient?.firstName} ${caseDetail.patient?.lastName}`}
              </h1>
              <p className="text-slate-500 mt-1 font-bold">
                {caseDetail.caseNumber} | Age: {caseDetail.patientAge || 'N/A'} | Gender: {caseDetail.patientGender || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-10 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Arrival Time</span>
              <p className="font-extrabold text-slate-800 text-xs">{new Date(caseDetail.arrivalTime).toLocaleTimeString()}</p>
              <p className="text-[10px] text-slate-400">{new Date(caseDetail.arrivalTime).toLocaleDateString()}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Brought By</span>
              <p className="font-extrabold text-slate-800 text-xs">{caseDetail.broughtBy || 'Self'}</p>
              {caseDetail.patientPhone && <p className="text-[10px] text-slate-500 flex items-center gap-1"><Phone className="h-3 w-3" /> {caseDetail.patientPhone}</p>}
            </div>
          </div>
        </div>

        {/* Vital Signs Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Heart className="h-4.5 w-4.5 text-red-500" />
            Intake Vitals
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center font-bold text-slate-700">
            
            <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl space-y-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Blood Pressure</span>
              <p className="text-base font-extrabold text-slate-850">
                {caseDetail.bpSystolic !== null ? `${caseDetail.bpSystolic}/${caseDetail.bpDiastolic}` : 'N/A'}
              </p>
              <span className="text-[9px] text-slate-400">mmHg</span>
            </div>

            <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl space-y-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Pulse</span>
              <p className="text-base font-extrabold text-slate-850">{caseDetail.pulse !== null ? caseDetail.pulse : 'N/A'}</p>
              <span className="text-[9px] text-slate-400">bpm</span>
            </div>

            <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl space-y-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Temperature</span>
              <p className="text-base font-extrabold text-slate-850">{caseDetail.temperature !== null ? `${caseDetail.temperature}°C` : 'N/A'}</p>
              <span className="text-[9px] text-slate-400">Celsius</span>
            </div>

            <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl space-y-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">SpO2</span>
              <p className="text-base font-extrabold text-slate-850">{caseDetail.spo2 !== null ? `${caseDetail.spo2}%` : 'N/A'}</p>
              <span className="text-[9px] text-slate-400">Oxygen Sat</span>
            </div>

            <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl space-y-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">GCS Coma Score</span>
              <p className="text-base font-extrabold text-slate-850">{caseDetail.gcsScore !== null ? `${caseDetail.gcsScore}/15` : 'N/A'}</p>
              <span className="text-[9px] text-slate-400">Glasgow Coma</span>
            </div>

            <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl space-y-1">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Mechanism</span>
              <p className="text-[11px] font-extrabold text-slate-800 mt-1 truncate px-1">{caseDetail.mechanismOfInjury || 'N/A'}</p>
              <span className="text-[9px] text-slate-400">Trauma Type</span>
            </div>

          </div>
        </div>

        {/* Workspace details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main timeline workspace (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Treatment actions log */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-6">
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">ER Clinical Actions & Procedures</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Treatment timeline</span>
              </div>

              {/* Add treatment action */}
              {isActive ? (
                <form onSubmit={handleLogAction} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4 print:hidden">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Record Medical Action</span>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Action Type:</label>
                      <select
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        className="p-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      >
                        <option value="MEDICATION">Medication Administered</option>
                        <option value="PROCEDURE">Procedure Done</option>
                        <option value="INVESTIGATION">Diagnostic Investigation</option>
                        <option value="NOTE">Clinical Note</option>
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="e.g. Administered Intravenous Saline 500ml, performed minor suturing..."
                    value={actionDesc}
                    onChange={(e) => setActionDesc(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-red-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loggingAction}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {loggingAction ? 'Saving...' : 'Log Action'}
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Action Log List */}
              {(!caseDetail.actions || caseDetail.actions.length === 0) ? (
                <p className="text-slate-400 italic text-[11px] text-center py-6">No treatment actions logged yet.</p>
              ) : (
                <div className="relative border-l border-slate-150 pl-5.5 space-y-5">
                  {caseDetail.actions.map((act: any) => (
                    <div key={act.id} className="relative">
                      {/* Node dot */}
                      <span className={cn(
                        'absolute -left-7 top-1 h-3 w-3 rounded-full border-2 border-white ring-4 ring-white shadow-sm block',
                        act.actionType === 'MEDICATION' && 'bg-emerald-500',
                        act.actionType === 'PROCEDURE' && 'bg-blue-500',
                        act.actionType === 'INVESTIGATION' && 'bg-amber-500',
                        act.actionType === 'NOTE' && 'bg-slate-500'
                      )} />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-600">
                            {act.actionType}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {new Date(act.performedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-750 font-bold leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 mt-1">{act.description}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 text-right">
                          By: {act.performer?.firstName} {act.performer?.lastName} ({act.performer?.role})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* General info & symptoms */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Clinical Context</h3>
              
              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Chief Complaint</span>
                  <p className="text-slate-850 text-xs font-bold mt-0.5">{caseDetail.chiefComplaint}</p>
                </div>
                {symptomsList.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block mb-1.5">Symptoms Declared</span>
                    <div className="flex flex-wrap gap-1.5">
                      {symptomsList.map((sym, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Panel: Doctor assignment & Case Close (1 Col) */}
          <div className="space-y-6">
            
            {/* Close case/Disposition Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">ER Outcome & Discharge</h3>
              
              {isActive ? (
                <form onSubmit={handleCloseCase} className="space-y-4 print:hidden">
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Disposition *</label>
                    <select
                      value={disposition}
                      onChange={(e) => setDisposition(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                    >
                      <option value="DISCHARGED">Discharge Stable</option>
                      {caseDetail.patientId ? (
                        <option value="ADMITTED">Admit as Inpatient (Ward)</option>
                      ) : null}
                      <option value="TRANSFERRED">Transfer Out</option>
                      <option value="DECEASED">Deceased</option>
                    </select>
                  </div>

                  {/* Ward / Bed picker if Inpatient Admission selected */}
                  {disposition === 'ADMITTED' && (
                    <div className="space-y-3 p-3 bg-red-50/20 border border-red-100/50 rounded-2xl animate-fade-in">
                      <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        Inpatient Ward Allocation
                      </p>
                      
                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Select Ward *</label>
                        <select
                          required
                          value={inpatientWardId}
                          onChange={(e) => handleWardChange(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                        >
                          <option value="">-- Choose Ward --</option>
                          {wards.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({w.wardType})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Select Available Bed *</label>
                        <select
                          required
                          value={inpatientBedId}
                          onChange={(e) => setInpatientBedId(e.target.value)}
                          disabled={!inpatientWardId || loadingBeds}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold disabled:opacity-50"
                        >
                          <option value="">-- Choose Bed --</option>
                          {beds.map(b => (
                            <option key={b.id} value={b.id}>{b.bedNumber}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Outcome Notes</label>
                    <textarea
                      placeholder="Summary of outcome diagnostics, referral details..."
                      rows={3}
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={closingCase}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {closingCase ? 'Processing Close...' : 'Close & Archive Case'}
                  </button>

                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Disposition Outcome</p>
                    <p className="text-slate-800 font-extrabold text-xs uppercase">{caseDetail.disposition}</p>
                    {caseDetail.dispositionTime && (
                      <p className="text-[9px] text-slate-400 mt-1 font-semibold">Closed: {new Date(caseDetail.dispositionTime).toLocaleString()}</p>
                    )}
                  </div>
                  {caseDetail.admission && (
                    <div 
                      onClick={() => router.push(`/inpatient/${caseDetail.admissionId}`)}
                      className="p-3.5 bg-teal-50 border border-teal-150 text-teal-800 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-teal-50/80 transition"
                    >
                      <div>
                        <p className="font-extrabold text-[11px] leading-tight">Linked Inpatient Admission</p>
                        <p className="text-[10px] text-teal-600 font-bold mt-1">Record: {caseDetail.admission.admissionNumber}</p>
                      </div>
                      <ChevronRight className="h-4.5 w-4.5 text-teal-650" />
                    </div>
                  )}
                  {caseDetail.notes && (
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Outcome summary Notes</span>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed font-semibold">{caseDetail.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Staff assignment card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Duty Assignment</h3>
              
              {isActive ? (
                <form onSubmit={handleAssignStaff} className="space-y-4 print:hidden">
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Attending ER Doctor *</label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                    >
                      <option value="">-- Choose Doctor --</option>
                      {doctors.map(d => (
                        <option key={d.userId || d.id} value={d.userId || d.id}>
                          Dr. {d.user?.firstName} {d.user?.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Assigned Nurse</label>
                    <select
                      value={selectedNurseId}
                      onChange={(e) => setSelectedNurseId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                    >
                      <option value="">-- Choose Nurse --</option>
                      {nurses.map((n: any) => (
                        <option key={n.userId || n.id} value={n.userId || n.id}>
                          {n.firstName || n.user?.firstName} {n.lastName || n.user?.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={assigningStaff}
                    className="w-full py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-250 transition cursor-pointer"
                  >
                    {assigningStaff ? 'Saving...' : 'Update Assignment'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3 font-semibold text-slate-700 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Attending ER MD</span>
                    <p className="font-extrabold text-slate-800 text-[11px] mt-0.5">
                      {caseDetail.doctor ? `Dr. ${caseDetail.doctor.firstName} ${caseDetail.doctor.lastName}` : 'Unassigned'}
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Staff Nurse</span>
                    <p className="font-extrabold text-slate-800 text-[11px] mt-0.5">
                      {caseDetail.nurse ? `${caseDetail.nurse.firstName} ${caseDetail.nurse.lastName}` : 'Unassigned'}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
