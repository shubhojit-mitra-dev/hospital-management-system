'use client';

import React, { useEffect, useState, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, User, Activity, FileText, Clock, Heart, Plus, ShieldAlert, Check,
  Thermometer, Wind, Scale, CheckCircle2, AlertTriangle, Trash2
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string | null;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  nationality: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  insuranceProvider: string | null;
  insurancePolicyNo: string | null;
  insuranceValidTill: string | null;
  isActive: boolean;
}

interface Vitals {
  id: string;
  recordedBy: string;
  weightKg: string | null;
  heightCm: string | null;
  bmi: string | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  pulseBpm: number | null;
  temperatureC: string | null;
  spo2Percent: number | null;
  respiratoryRate: number | null;
  notes: string | null;
  recordedAt: string;
}

interface MedicalHistory {
  allergies: Array<{ substance: string; reaction: string; severity: 'MILD' | 'MODERATE' | 'SEVERE' }>;
  conditions: Array<{ name: string; diagnosedYear: number; status: 'ONGOING' | 'RESOLVED' }>;
  surgeries: Array<{ procedure: string; date: string; hospital: string }>;
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  smokingStatus: string | null;
  alcoholStatus: string | null;
  exerciseFrequency: string | null;
  familyHistory: Array<{ condition: string; relation: string }>;
}

interface TimelineEvent {
  type: 'APPOINTMENT' | 'CONSULTATION' | 'PRESCRIPTION' | 'LAB_RESULT' | 'BILLING';
  date: string;
  summary: string;
  status?: string;
  entityId: string;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const patientId = params.id as string;

  const [activeTab, setActiveTab] = useState<'profile' | 'vitals' | 'history' | 'timeline'>('profile');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitalsList, setVitalsList] = useState<Vitals[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Vitals Form State
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    weightKg: '',
    heightCm: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    pulseBpm: '',
    temperatureC: '',
    spo2Percent: '',
    respiratoryRate: '',
    notes: '',
  });

  // Medical History Edit State
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState<MedicalHistory>({
    allergies: [],
    conditions: [],
    surgeries: [],
    medications: [],
    smokingStatus: '',
    alcoholStatus: '',
    exerciseFrequency: '',
    familyHistory: [],
  });

  // Fetch Patient profile, vitals, history, timeline
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patientRes, vitalsRes, historyRes, timelineRes] = await Promise.all([
        api.get(`/api/v1/patients/${patientId}`),
        api.get(`/api/v1/patients/${patientId}/vitals`),
        api.get(`/api/v1/patients/${patientId}/history`),
        api.get(`/api/v1/patients/${patientId}/timeline`),
      ]);

      setPatient(patientRes.data);
      setVitalsList(vitalsRes.data);
      setMedicalHistory(historyRes.data);
      setHistoryForm(historyRes.data);
      setTimeline(timelineRes.data.timeline || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch patient data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  // Live BMI preview
  const getBmiPreview = () => {
    const w = parseFloat(vitalsForm.weightKg);
    const h = parseFloat(vitalsForm.heightCm);
    if (!isNaN(w) && !isNaN(h) && h > 0) {
      const heightM = h / 100;
      return (w / (heightM * heightM)).toFixed(2);
    }
    return null;
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

  const handleVitalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: any = { ...vitalsForm };
      // Convert numeric fields
      const numericFields = ['weightKg', 'heightCm', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'pulseBpm', 'temperatureC', 'spo2Percent', 'respiratoryRate'];
      numericFields.forEach((field) => {
        if (payload[field]) {
          payload[field] = parseFloat(payload[field]);
        } else {
          payload[field] = null;
        }
      });

      await api.post(`/api/v1/patients/${patientId}/vitals`, payload);
      setShowAddVitals(false);
      // Reset form
      setVitalsForm({
        weightKg: '',
        heightCm: '',
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        pulseBpm: '',
        temperatureC: '',
        spo2Percent: '',
        respiratoryRate: '',
        notes: '',
      });
      // Refresh vitals
      const vitalsRes = await api.get(`/api/v1/patients/${patientId}/vitals`);
      setVitalsList(vitalsRes.data);
      // Refresh timeline
      const timelineRes = await api.get(`/api/v1/patients/${patientId}/timeline`);
      setTimeline(timelineRes.data.timeline || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save vitals.');
    }
  };

  const handleHistorySave = async () => {
    setError('');
    try {
      await api.patch(`/api/v1/patients/${patientId}/history`, historyForm);
      setIsEditingHistory(false);
      // Refresh history
      const historyRes = await api.get(`/api/v1/patients/${patientId}/history`);
      setMedicalHistory(historyRes.data);
      setHistoryForm(historyRes.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save medical history.');
    }
  };

  // Helper lists adder/remover for medical history
  const addAllergen = () => {
    setHistoryForm((prev) => ({
      ...prev,
      allergies: [...prev.allergies, { substance: '', reaction: '', severity: 'MILD' }],
    }));
  };

  const removeAllergen = (idx: number) => {
    setHistoryForm((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== idx),
    }));
  };

  const updateAllergen = (idx: number, field: string, val: string) => {
    setHistoryForm((prev) => {
      const updated = [...prev.allergies];
      updated[idx] = { ...updated[idx], [field]: val } as any;
      return { ...prev, allergies: updated };
    });
  };

  const addCondition = () => {
    setHistoryForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { name: '', diagnosedYear: new Date().getFullYear(), status: 'ONGOING' }],
    }));
  };

  const removeCondition = (idx: number) => {
    setHistoryForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== idx),
    }));
  };

  const updateCondition = (idx: number, field: string, val: any) => {
    setHistoryForm((prev) => {
      const updated = [...prev.conditions];
      updated[idx] = { ...updated[idx], [field]: val } as any;
      return { ...prev, conditions: updated };
    });
  };

  const addMedication = () => {
    setHistoryForm((prev) => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '' }],
    }));
  };

  const removeMedication = (idx: number) => {
    setHistoryForm((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== idx),
    }));
  };

  const updateMedication = (idx: number, field: string, val: string) => {
    setHistoryForm((prev) => {
      const updated = [...prev.medications];
      updated[idx] = { ...updated[idx], [field]: val } as any;
      return { ...prev, medications: updated };
    });
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PATIENT']}>
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
          <span className="font-semibold">Loading patient file...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PATIENT']}>
        <div className="text-center p-12 text-slate-500">Patient not found.</div>
      </DashboardLayout>
    );
  }

  const isNurse = user?.role === 'NURSE';
  const isDoctor = user?.role === 'DOCTOR';
  const isClinical = isNurse || isDoctor;

  // Severe allergies check
  const severeAllergies = medicalHistory?.allergies.filter((a) => a.severity === 'SEVERE') || [];

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PATIENT']}>
      <div className="space-y-6">
        {/* Severe Allergy Alert Banner */}
        {severeAllergies.length > 0 && (
          <div className="bg-red-50 border border-red-200 p-4.5 rounded-2xl flex items-start gap-3 text-red-800 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">CRITICAL ALLERGY ALERT</p>
              <p className="text-xs font-semibold text-red-700 mt-1">
                Patient has severe reactions to: {severeAllergies.map((a) => `${a.substance} (${a.reaction})`).join(', ')}.
              </p>
            </div>
          </div>
        )}

        {/* Back and Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/patients')}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{patient.firstName} {patient.lastName}</h1>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
                  {patient.patientNumber}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-semibold mt-1">
                {patient.gender} • {calculateAge(patient.dateOfBirth)} years old (DOB: {new Date(patient.dateOfBirth).toLocaleDateString()})
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isNurse && (
              <button
                onClick={() => {
                  setActiveTab('vitals');
                  setShowAddVitals(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Record Vitals
              </button>
            )}
            {isClinical && (
              <button
                onClick={() => {
                  setActiveTab('history');
                  setIsEditingHistory(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                Update History
              </button>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 gap-6">
          {(['profile', 'vitals', 'history', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => startTransition(() => {
                setActiveTab(tab);
                setShowAddVitals(false);
                setIsEditingHistory(false);
              })}
              className={cn(
                'py-3 border-b-2 font-semibold text-sm transition-all capitalize px-1 cursor-pointer',
                activeTab === tab 
                  ? 'border-teal-600 text-teal-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab === 'profile' ? 'Demographics & Insurance' : tab}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 font-semibold text-sm">
            {error}
          </div>
        )}

        {/* TAB CONTENTS */}
        <div className="space-y-6">
          {/* PROFILE / DEMOGRAPHICS TAB */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Demographics details */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Contact Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5 text-sm font-semibold text-slate-700">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Primary Phone</span>
                      <span className="mt-1 block">{patient.phone}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Alternate Phone</span>
                      <span className="mt-1 block">{patient.alternatePhone || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Email Address</span>
                      <span className="mt-1 block">{patient.email || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nationality</span>
                      <span className="mt-1 block">{patient.nationality}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Residential Address</h3>
                  <div className="mt-3 text-sm font-semibold text-slate-700 space-y-1">
                    <p>{patient.address || '—'}</p>
                    <p>{[patient.city, patient.state, patient.pincode].filter(Boolean).join(', ')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Insurance Coverage</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3.5 text-sm font-semibold text-slate-700">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Insurance Provider</span>
                      <span className="mt-1 block">{patient.insuranceProvider || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Policy Number</span>
                      <span className="mt-1 block font-mono">{patient.insurancePolicyNo || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Validity Period</span>
                      <span className="mt-1 block">
                        {patient.insuranceValidTill ? new Date(patient.insuranceValidTill).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Emergency contact & details */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Emergency Contact</h3>
                  {patient.emergencyContactName ? (
                    <div className="space-y-3 text-sm font-semibold text-slate-700">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Full Name</span>
                        <span className="mt-1 block">{patient.emergencyContactName}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Phone Connection</span>
                        <span className="mt-1 block text-teal-600 font-bold">{patient.emergencyContactPhone}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Relationship</span>
                        <span className="mt-1 block">{patient.emergencyContactRelationship}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 font-semibold italic">No emergency contact configured.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VITALS TAB */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              {showAddVitals && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Record New Vital Signs</h3>
                  <form onSubmit={handleVitalsSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Weight (Kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitalsForm.weightKg}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, weightKg: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Height (Cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitalsForm.heightCm}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, heightCm: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Systolic BP</label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={vitalsForm.bloodPressureSystolic}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, bloodPressureSystolic: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Diastolic BP</label>
                      <input
                        type="number"
                        placeholder="e.g. 80"
                        value={vitalsForm.bloodPressureDiastolic}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, bloodPressureDiastolic: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Pulse (Bpm)</label>
                      <input
                        type="number"
                        placeholder="e.g. 72"
                        value={vitalsForm.pulseBpm}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, pulseBpm: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 37.0"
                        value={vitalsForm.temperatureC}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, temperatureC: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        placeholder="e.g. 98"
                        value={vitalsForm.spo2Percent}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, spo2Percent: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Respiratory Rate</label>
                      <input
                        type="number"
                        placeholder="e.g. 16"
                        value={vitalsForm.respiratoryRate}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, respiratoryRate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Clinical Notes</label>
                      <input
                        type="text"
                        value={vitalsForm.notes}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, notes: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="flex items-end gap-2 col-span-2 md:col-span-1">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Save Vitals
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddVitals(false)}
                        className="py-2 px-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  {getBmiPreview() && (
                    <div className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-2.5 rounded-xl border border-teal-100 inline-block">
                      Computed BMI: {getBmiPreview()}
                    </div>
                  )}
                </div>
              )}

              {/* Latest Vitals Overview Cards */}
              {vitalsList.length > 0 && (() => {
                const latestVitals = vitalsList[0]!;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                      <Scale className="h-9 w-9 text-blue-500 bg-blue-50 p-2 rounded-xl" />
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Weight & BMI</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5">
                          {latestVitals.weightKg} Kg • {latestVitals.bmi ? parseFloat(latestVitals.bmi).toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                      <Heart className="h-9 w-9 text-red-500 bg-red-50 p-2 rounded-xl" />
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Blood Pressure</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5">
                          {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic} mmHg
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                      <Wind className="h-9 w-9 text-teal-500 bg-teal-50 p-2 rounded-xl" />
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Pulse & Oxygen</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5">
                          {latestVitals.pulseBpm} Bpm • SpO2 {latestVitals.spo2Percent}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                      <Thermometer className="h-9 w-9 text-amber-500 bg-amber-50 p-2 rounded-xl" />
                      <div>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Temperature</span>
                        <span className="font-bold text-slate-800 text-sm mt-0.5">
                          {latestVitals.temperatureC}°C
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Vitals History List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800">Vitals History Log</h3>
                </div>
                {vitalsList.length === 0 ? (
                  <p className="p-12 text-center text-slate-400 font-medium italic">No vitals registered yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                          <th className="p-4">Recorded At</th>
                          <th className="p-4">BP</th>
                          <th className="p-4">Pulse</th>
                          <th className="p-4">Weight/Height</th>
                          <th className="p-4">BMI</th>
                          <th className="p-4">Temp</th>
                          <th className="p-4">SpO2</th>
                          <th className="p-4">Resp Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {vitalsList.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/50">
                            <td className="p-4 text-xs font-bold text-slate-500">
                              {new Date(v.recordedAt).toLocaleString()}
                            </td>
                            <td className="p-4">
                              {v.bloodPressureSystolic && v.bloodPressureDiastolic 
                                ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`
                                : '—'}
                            </td>
                            <td className="p-4">{v.pulseBpm ? `${v.pulseBpm} bpm` : '—'}</td>
                            <td className="p-4">{v.weightKg ? `${v.weightKg} kg` : '—'} / {v.heightCm ? `${v.heightCm} cm` : '—'}</td>
                            <td className="p-4">
                              {v.bmi ? (
                                <span className="font-mono text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                  {parseFloat(v.bmi).toFixed(2)}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-4">{v.temperatureC ? `${v.temperatureC} °C` : '—'}</td>
                            <td className="p-4">{v.spo2Percent ? `${v.spo2Percent}%` : '—'}</td>
                            <td className="p-4">{v.respiratoryRate || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEDICAL HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {isEditingHistory && historyForm ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800">Edit Patient Medical Records</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleHistorySave}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Save Updates
                      </button>
                      <button
                        onClick={() => setIsEditingHistory(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Lifestyle inputs */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Smoking Status</label>
                      <select
                        value={historyForm.smokingStatus || ''}
                        onChange={(e) => setHistoryForm((h) => ({ ...h, smokingStatus: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        <option value="">Select Status</option>
                        <option value="NEVER">Never</option>
                        <option value="FORMER">Former</option>
                        <option value="CURRENT">Current</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Alcohol Consumption</label>
                      <select
                        value={historyForm.alcoholStatus || ''}
                        onChange={(e) => setHistoryForm((h) => ({ ...h, alcoholStatus: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      >
                        <option value="">Select Status</option>
                        <option value="NEVER">Never</option>
                        <option value="OCCASIONAL">Occasional</option>
                        <option value="REGULAR">Regular</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Exercise Frequency</label>
                      <input
                        type="text"
                        placeholder="e.g. Twice a week"
                        value={historyForm.exerciseFrequency || ''}
                        onChange={(e) => setHistoryForm((h) => ({ ...h, exerciseFrequency: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  {/* Allergies list editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Allergies</h4>
                      <button
                        type="button"
                        onClick={addAllergen}
                        className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Allergy
                      </button>
                    </div>
                    {historyForm.allergies.map((allergy, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Substance (e.g. Penicillin)"
                          value={allergy.substance}
                          onChange={(e) => updateAllergen(idx, 'substance', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Reaction (e.g. Rash)"
                          value={allergy.reaction}
                          onChange={(e) => updateAllergen(idx, 'reaction', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                        />
                        <select
                          value={allergy.severity}
                          onChange={(e) => updateAllergen(idx, 'severity', e.target.value as any)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50"
                        >
                          <option value="MILD">Mild</option>
                          <option value="MODERATE">Moderate</option>
                          <option value="SEVERE">Severe</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeAllergen(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 border border-slate-200 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Conditions editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chronic Conditions</h4>
                      <button
                        type="button"
                        onClick={addCondition}
                        className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Condition
                      </button>
                    </div>
                    {historyForm.conditions.map((cond, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Condition Name (e.g. Diabetes)"
                          value={cond.name}
                          onChange={(e) => updateCondition(idx, 'name', e.target.value)}
                          className="flex-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                        />
                        <input
                          type="number"
                          placeholder="Diagnosed Year"
                          value={cond.diagnosedYear}
                          onChange={(e) => updateCondition(idx, 'diagnosedYear', parseInt(e.target.value))}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                        />
                        <select
                          value={cond.status}
                          onChange={(e) => updateCondition(idx, 'status', e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50"
                        >
                          <option value="ONGOING">Ongoing</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeCondition(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 border border-slate-200 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Medications editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Medications</h4>
                      <button
                        type="button"
                        onClick={addMedication}
                        className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Medication
                      </button>
                    </div>
                    {historyForm.medications.map((med, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input
                          type="text"
                          placeholder="Medication Name"
                          value={med.name}
                          onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                          className="flex-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg)"
                          value={med.dosage}
                          onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Frequency (e.g. Twice daily)"
                          value={med.frequency}
                          onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => removeMedication(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 border border-slate-200 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Read only history lists */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Allergies Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Known Allergies</h3>
                      {medicalHistory?.allergies.length === 0 ? (
                        <p className="text-xs text-slate-400 font-semibold italic">No known drug or environmental allergies.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {medicalHistory?.allergies.map((allergy, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                              <span className={cn(
                                'h-2 w-2 rounded-full flex-shrink-0',
                                allergy.severity === 'SEVERE' ? 'bg-red-500 animate-pulse' :
                                allergy.severity === 'MODERATE' ? 'bg-amber-500' : 'bg-slate-400'
                              )} />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800">{allergy.substance}</p>
                                <p className="text-xs text-slate-500 font-semibold truncate">
                                  {allergy.reaction} ({allergy.severity.toLowerCase()})
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chronic Conditions */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Chronic Medical Conditions</h3>
                      {medicalHistory?.conditions.length === 0 ? (
                        <p className="text-xs text-slate-400 font-semibold italic">No chronic medical conditions registered.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {medicalHistory?.conditions.map((c, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50/20 text-sm font-semibold">
                              <div>
                                <p className="text-slate-800 font-bold">{c.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Diagnosed: {c.diagnosedYear}</p>
                              </div>
                              <span className={cn(
                                'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                                c.status === 'ONGOING' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                              )}>
                                {c.status.toLowerCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Current Medications */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Current Medications</h3>
                      {medicalHistory?.medications.length === 0 ? (
                        <p className="text-xs text-slate-400 font-semibold italic">No active prescriptions registered.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {medicalHistory?.medications.map((m, i) => (
                            <div key={i} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm font-semibold">
                              <div>
                                <p className="text-slate-800 font-bold">{m.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{m.dosage}</p>
                              </div>
                              <span className="text-xs text-slate-500 font-bold">{m.frequency}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lifestyle Sidebar */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5">Lifestyle Profile</h3>
                      <div className="space-y-3.5 text-sm font-semibold text-slate-700">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Smoking Status</span>
                          <span className="mt-1 block font-bold capitalize">{medicalHistory?.smokingStatus?.toLowerCase() || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Alcohol Consumption</span>
                          <span className="mt-1 block font-bold capitalize">{medicalHistory?.alcoholStatus?.toLowerCase() || '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Exercise Frequency</span>
                          <span className="mt-1 block">{medicalHistory?.exerciseFrequency || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Complete Clinical Timeline</h3>
              {timeline.length === 0 ? (
                <p className="p-8 text-center text-slate-400 font-semibold italic">No timeline logs found for this patient.</p>
              ) : (
                <div className="relative border-l border-slate-200 ml-4.5 space-y-6 pb-4">
                  {timeline.map((evt, idx) => (
                    <div key={idx} className="relative pl-6">
                      {/* Timeline dot */}
                      <span className={cn(
                        'absolute -left-2 top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white flex items-center justify-center',
                        evt.type === 'APPOINTMENT' ? 'bg-blue-500' :
                        evt.type === 'CONSULTATION' ? 'bg-teal-500' :
                        evt.type === 'PRESCRIPTION' ? 'bg-purple-500' :
                        evt.type === 'LAB_RESULT' ? 'bg-amber-500' : 'bg-slate-400'
                      )} />
                      <div className="text-sm font-semibold text-slate-700">
                        <span className="text-xs font-bold text-slate-400 block mb-0.5">
                          {new Date(evt.date).toLocaleString()}
                        </span>
                        <p className="text-slate-800 font-bold">{evt.summary}</p>
                        {evt.status && (
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                            {evt.status.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
