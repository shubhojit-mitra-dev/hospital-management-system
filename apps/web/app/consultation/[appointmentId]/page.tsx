'use client';

import React, { useEffect, useState, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Heart, Save, AlertTriangle, CheckCircle, Search, Plus, Trash2, 
  Upload, FileText, Download, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientNumber: string;
  gender: string;
  dateOfBirth: string;
}

interface Vitals {
  recordedAt: string;
  weightKg: string | null;
  heightCm: string | null;
  bmi: string | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  pulseBpm: number | null;
  temperatureC: string | null;
  spo2Percent: number | null;
  respiratoryRate: number | null;
}

interface Allergy {
  substance: string;
  reaction: string;
  severity: string;
}

interface ICDCode {
  code: string;
  description: string;
}

interface EMRRecord {
  id: string;
  title: string;
  recordType: string;
  fileName: string;
  fileUrl: string;
  recordedDate: string;
}

export default function ConsultationWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.appointmentId as string;

  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [emrRecords, setEmrRecords] = useState<EMRRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Right Panel Tabs
  const [activeTab, setActiveTab] = useState<'soap' | 'diagnosis' | 'prescription' | 'emr'>('soap');

  // SOAP Form State
  const [consultationId, setConsultationId] = useState('');
  const [soapForm, setSoapForm] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    chiefComplaint: '',
    diagnosis: '',
    severity: 'MILD',
    followUpRequired: false,
    followUpAfterDays: '7',
    followUpNotes: '',
  });

  // ICD-10 Search & Selected State
  const [icdSearch, setIcdSearch] = useState('');
  const [icdResults, setIcdResults] = useState<ICDCode[]>([]);
  const [selectedIcdCodes, setSelectedIcdCodes] = useState<ICDCode[]>([]);

  // Prescription Items State
  const [rxNotes, setRxNotes] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<any[]>([
    { medicineName: '', genericName: '', dosage: '', form: 'TABLET', route: 'ORAL', frequency: 'Twice daily', durationDays: '7', quantity: '14' }
  ]);
  const [allergyWarnings, setAllergyWarnings] = useState<string[]>([]);

  // EMR Upload State
  const [emrTitle, setEmrTitle] = useState('');
  const [emrType, setEmrType] = useState('LAB_REPORT');
  const [emrFile, setEmrFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch consultation workspace details
  const fetchWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Start or Get Consultation draft
      const startRes = await api.post('/api/v1/consultations', { appointmentId });
      const cons = startRes.data;
      setConsultationId(cons.id);
      setSoapForm({
        subjective: cons.subjective || '',
        objective: cons.objective || '',
        assessment: cons.assessment || '',
        plan: cons.plan || '',
        chiefComplaint: cons.chiefComplaint || '',
        diagnosis: cons.diagnosis || '',
        severity: cons.severity || 'MILD',
        followUpRequired: cons.followUpRequired || false,
        followUpAfterDays: cons.followUpAfterDays?.toString() || '7',
        followUpNotes: cons.followUpNotes || '',
      });
      setSelectedIcdCodes(cons.icdCodes || []);

      // Step 2: Fetch appointment detail (contains patient and doctor details)
      const aptRes = await api.get(`/api/v1/appointments/${appointmentId}`);
      setAppointment(aptRes.data);
      setPatient(aptRes.data.patient);

      // Step 3: Fetch patient details: vitals, allergies, EMRs
      const patId = aptRes.data.patientId;
      const [vitalsRes, historyRes, emrRes] = await Promise.all([
        api.get(`/api/v1/patients/${patId}/vitals`),
        api.get(`/api/v1/patients/${patId}/history`),
        api.get(`/api/v1/emr/patient/${patId}`),
      ]);

      if (vitalsRes.data && vitalsRes.data.length > 0) {
        setVitals(vitalsRes.data[0]); // Get latest vitals
      }
      setAllergies(historyRes.data?.allergies || []);
      setEmrRecords(emrRes.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to initialize consultation workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [appointmentId]);

  // Live ICD-10 Search Autocomplete
  useEffect(() => {
    const searchICD = async () => {
      if (!icdSearch) {
        setIcdResults([]);
        return;
      }
      try {
        const res = await api.get('/api/v1/icd-codes', {
          params: { search: icdSearch }
        });
        setIcdResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    const delay = setTimeout(searchICD, 300);
    return () => clearTimeout(delay);
  }, [icdSearch]);

  // Client-side allergy check when prescription items change
  useEffect(() => {
    const warnings: string[] = [];
    prescriptionItems.forEach((item) => {
      if (!item.medicineName) return;
      const matched = allergies.find(
        (a) => a.substance.toLowerCase() === item.medicineName.toLowerCase()
      );
      if (matched) {
        warnings.push(`Allergy Alert: Patient is allergic to ${item.medicineName} (${matched.reaction} - ${matched.severity})`);
      }
    });
    setAllergyWarnings(warnings);
  }, [prescriptionItems, allergies]);

  // Save Draft (SOAP notes)
  const saveDraft = async () => {
    if (!consultationId) return;
    setError('');
    setSuccess('');
    try {
      await api.patch(`/api/v1/consultations/${consultationId}`, {
        ...soapForm,
        icdCodes: selectedIcdCodes,
      });
      setSuccess('Consultation draft saved successfully.');
    } catch (err) {
      console.error(err);
      setError('Failed to save draft.');
    }
  };

  // Complete consultation
  const handleComplete = async () => {
    if (!consultationId) return;
    setError('');
    setSuccess('');
    try {
      // 1. Save final SOAP notes
      await api.patch(`/api/v1/consultations/${consultationId}`, {
        ...soapForm,
        icdCodes: selectedIcdCodes,
      });

      // 2. Submit Prescription if items exist
      const activeItems = prescriptionItems.filter((i) => i.medicineName);
      if (activeItems.length > 0) {
        await api.post('/api/v1/consultations/prescription', {
          consultationId,
          notes: rxNotes,
          items: activeItems,
        });
      }

      // 3. Mark consultation complete
      await api.patch(`/api/v1/consultations/${consultationId}/complete`);
      setSuccess('Consultation completed successfully. Redirecting...');
      setTimeout(() => {
        router.push(`/appointments/queue/${appointment.doctorId}`);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to complete consultation.');
    }
  };

  // Prescription builder helpers
  const addRxItem = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      { medicineName: '', genericName: '', dosage: '', form: 'TABLET', route: 'ORAL', frequency: 'Twice daily', durationDays: '7', quantity: '14' }
    ]);
  };

  const removeRxItem = (idx: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRxItem = (idx: number, field: string, val: string) => {
    setPrescriptionItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // EMR Document Upload helper
  const handleEMRUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emrFile || !emrTitle || !patient) return;
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(emrFile);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await api.post('/api/v1/emr/upload', {
          patientId: patient.id,
          consultationId,
          recordType: emrType,
          title: emrTitle,
          fileName: emrFile.name,
          fileMimeType: emrFile.type,
          fileContentBase64: base64,
          recordedDate: new Date().toISOString().split('T')[0],
          tags: [emrType],
        });
        
        setEmrTitle('');
        setEmrFile(null);
        // Refresh EMR list
        const emrRes = await api.get(`/api/v1/emr/patient/${patient.id}`);
        setEmrRecords(emrRes.data || []);
      };
    } catch (err) {
      console.error(err);
      setError('Failed to upload EMR file.');
    } finally {
      setUploading(false);
    }
  };

  const calculateAge = (dobString: string) => {
    const birth = new Date(dobString);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['DOCTOR']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="font-semibold">Loading consultation workspace...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['DOCTOR']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Clinical Consultation Workspace</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">SOAP documentation and prescription order desk.</p>
            </div>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl text-sm">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {success}
        </div>}

        {/* Workspace Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT PANEL: Patient Summary */}
          <div className="space-y-6">
            {/* Patient Card */}
            {patient && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-semibold text-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Patient info</h3>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">{patient.firstName} {patient.lastName}</h2>
                    <span className="text-xs text-slate-500">{patient.gender} • {calculateAge(patient.dateOfBirth)} yrs</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                    {patient.patientNumber}
                  </span>
                </div>
              </div>
            )}

            {/* Latest Vitals */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-semibold text-slate-700 text-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Latest Vitals</h3>
              {vitals ? (
                <div className="grid grid-cols-2 gap-3.5 mt-2">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Weight / BMI</span>
                    <span className="text-slate-800">{vitals.weightKg} kg • {vitals.bmi ? parseFloat(vitals.bmi).toFixed(1) : '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Blood Pressure</span>
                    <span className="text-slate-800">{vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Pulse Rate</span>
                    <span className="text-slate-800">{vitals.pulseBpm} bpm</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Temperature</span>
                    <span className="text-slate-800">{vitals.temperatureC} °C</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No vitals registered for this visit.</p>
              )}
            </div>

            {/* Allergies list */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-semibold text-slate-700 text-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Drug Allergies</h3>
              {allergies.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No drug allergies registered.</p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {allergies.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100/50 px-2 py-1 rounded-lg">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                      <span>{a.substance} ({a.reaction} - {a.severity})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Main clinical working area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between min-h-[500px]">
              
              {/* Workspace Navigation Tabs */}
              <div>
                <div className="flex border-b border-slate-200 bg-slate-50/50 px-4">
                  {(['soap', 'diagnosis', 'prescription', 'emr'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'py-3.5 px-3 border-b-2 font-bold text-xs transition-all uppercase tracking-wider cursor-pointer',
                        activeTab === tab 
                          ? 'border-teal-600 text-teal-600' 
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {tab === 'soap' ? 'SOAP Notes' : tab}
                    </button>
                  ))}
                </div>

                {/* Tab contents */}
                <div className="p-6">
                  {/* SOAP TAB */}
                  {activeTab === 'soap' && (
                    <div className="space-y-4 font-semibold text-sm">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chief Complaint / Symptoms</label>
                        <textarea
                          rows={2}
                          value={soapForm.chiefComplaint}
                          onChange={(e) => setSoapForm({ ...soapForm, chiefComplaint: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                          placeholder="Symptoms stated by the patient"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subjective Notes</label>
                          <textarea
                            rows={3}
                            value={soapForm.subjective}
                            onChange={(e) => setSoapForm({ ...soapForm, subjective: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="Patient's description of illness"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Objective Examination</label>
                          <textarea
                            rows={3}
                            value={soapForm.objective}
                            onChange={(e) => setSoapForm({ ...soapForm, objective: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="Examination findings"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assessment / Diagnosis Text</label>
                          <textarea
                            rows={3}
                            value={soapForm.assessment}
                            onChange={(e) => setSoapForm({ ...soapForm, assessment: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="Diagnosis clinical assessment notes"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Treatment Plan</label>
                          <textarea
                            rows={3}
                            value={soapForm.plan}
                            onChange={(e) => setSoapForm({ ...soapForm, plan: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            placeholder="Detailed treatment plan"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DIAGNOSIS TAB */}
                  {activeTab === 'diagnosis' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">ICD-10 Code autocomplete lookup</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Search by ICD code or description (e.g. Hypertension)..."
                            value={icdSearch}
                            onChange={(e) => setIcdSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                          />
                        </div>
                        {icdResults.length > 0 && (
                          <div className="border border-slate-200 rounded-xl mt-2 max-h-[180px] overflow-y-auto divide-y divide-slate-100 font-semibold text-slate-700 text-sm bg-white shadow-lg">
                            {icdResults.map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  if (!selectedIcdCodes.some(c => c.code === item.code)) {
                                    setSelectedIcdCodes([...selectedIcdCodes, item]);
                                  }
                                  setIcdSearch('');
                                  setIcdResults([]);
                                }}
                                className="w-full text-left p-3 hover:bg-slate-50 flex gap-2 cursor-pointer"
                              >
                                <span className="font-bold text-teal-700 font-mono">{item.code}</span>
                                <span>{item.description}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Selected ICD Codes */}
                      <div className="space-y-2 pt-3 border-t border-slate-100 font-semibold text-sm">
                        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Selected Diagnoses</span>
                        {selectedIcdCodes.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No ICD codes selected. Use search box above.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedIcdCodes.map((item) => (
                              <div key={item.code} className="flex items-center gap-1.5 bg-teal-50 border border-teal-100 text-teal-800 text-xs px-2.5 py-1 rounded-xl">
                                <span className="font-bold font-mono">{item.code}</span>
                                <span>{item.description}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedIcdCodes(selectedIcdCodes.filter(c => c.code !== item.code))}
                                  className="text-teal-600 hover:text-teal-900 font-bold ml-1 cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PRESCRIPTION BUILDER TAB */}
                  {activeTab === 'prescription' && (
                    <div className="space-y-4">
                      {allergyWarnings.length > 0 && (
                        <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-red-800 text-xs font-bold space-y-1">
                          {allergyWarnings.map((warning, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Medication List</span>
                        <button
                          type="button"
                          onClick={addRxItem}
                          className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Drug
                        </button>
                      </div>

                      <div className="space-y-3">
                        {prescriptionItems.map((item, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row gap-2 border border-slate-100 p-3 rounded-xl bg-slate-50/20 items-end">
                            <div className="flex-2 w-full">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Medicine Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Paracetamol"
                                value={item.medicineName}
                                onChange={(e) => updateRxItem(idx, 'medicineName', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                              />
                            </div>
                            <div className="flex-1 w-full">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Dosage</label>
                              <input
                                type="text"
                                placeholder="e.g. 500mg"
                                value={item.dosage}
                                onChange={(e) => updateRxItem(idx, 'dosage', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                              />
                            </div>
                            <div className="flex-1 w-full">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Frequency</label>
                              <input
                                type="text"
                                placeholder="e.g. Twice daily"
                                value={item.frequency}
                                onChange={(e) => updateRxItem(idx, 'frequency', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                              />
                            </div>
                            <div className="flex-1 w-full">
                              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Duration</label>
                              <input
                                type="number"
                                placeholder="Days"
                                value={item.durationDays}
                                onChange={(e) => updateRxItem(idx, 'durationDays', e.target.value)}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRxItem(idx)}
                              className="p-1.5 text-red-500 hover:bg-red-50 border border-slate-200 rounded-lg cursor-pointer flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prescription Notes</label>
                        <input
                          type="text"
                          value={rxNotes}
                          onChange={(e) => setRxNotes(e.target.value)}
                          placeholder="General instructions for pharmacist or patient..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* EMR UPLOADER TAB */}
                  {activeTab === 'emr' && (
                    <div className="space-y-6">
                      {/* Upload Form */}
                      <form onSubmit={handleEMRUpload} className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 space-y-3 font-semibold text-xs text-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Document Title</label>
                            <input
                              type="text"
                              value={emrTitle}
                              onChange={(e) => setEmrTitle(e.target.value)}
                              className="w-full px-2.5 py-2 border border-slate-200 bg-white rounded-lg"
                              placeholder="e.g. Lab Report - CBC Blood Test"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-450 uppercase font-bold mb-1">Record Type</label>
                            <select
                              value={emrType}
                              onChange={(e) => setEmrType(e.target.value)}
                              className="w-full px-2.5 py-2 border border-slate-200 bg-white rounded-lg"
                            >
                              <option value="LAB_REPORT">Lab Report</option>
                              <option value="XRAY">X-Ray</option>
                              <option value="MRI">MRI Scan</option>
                              <option value="CT_SCAN">CT Scan</option>
                              <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                          <input
                            type="file"
                            onChange={(e) => setEmrFile(e.target.files?.[0] || null)}
                            className="text-xs"
                            required
                          />
                          <button
                            type="submit"
                            disabled={uploading}
                            className="px-4.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1 text-[11px] disabled:opacity-50 cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {uploading ? 'Uploading...' : 'Upload File'}
                          </button>
                        </div>
                      </form>

                      {/* Document List */}
                      <div className="space-y-2.5 pt-3 border-t border-slate-100 font-semibold text-sm">
                        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Document Archives</span>
                        {emrRecords.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No files archived yet.</p>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {emrRecords.map((doc) => (
                              <div key={doc.id} className="py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4.5 w-4.5 text-slate-450" />
                                  <div>
                                    <p className="text-slate-800 font-bold text-xs">{doc.title}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{doc.fileName} • {new Date(doc.recordedDate).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <a
                                  href={`${api.defaults.baseURL}/api/v1/emr/${doc.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1 text-[10px] font-bold"
                                >
                                  <Download className="h-3.5 w-3.5" /> Download
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Workspace Action Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3 items-center">
                <button
                  type="button"
                  onClick={saveDraft}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-white text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-teal-600/10"
                >
                  <CheckCircle className="h-4.5 w-4.5" /> Complete Consultation
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
