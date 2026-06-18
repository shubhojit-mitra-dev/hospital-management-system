'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Activity, AlertCircle, FileText, User } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function CreateEmergencyPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<any[]>([]);
  const [nurses, setNurses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [isRegistered, setIsRegistered] = useState(true);
  const [patientId, setPatientId] = useState('');
  
  // Unknown patient fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('MALE');
  const [patientPhone, setPatientPhone] = useState('');

  const [broughtBy, setBroughtBy] = useState('Ambulance');
  const [triageLevel, setTriageLevel] = useState('IMMEDIATE');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [mechanismOfInjury, setMechanismOfInjury] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');

  // Initial vitals
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');
  const [gcsScore, setGcsScore] = useState('15');
  const [assignedNurseId, setAssignedNurseId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patRes, staffRes] = await Promise.all([
        api.get('/api/v1/patients'),
        api.get('/api/v1/staff')
      ]);
      setPatients(patRes.data?.patients || patRes.data?.data || []);
      
      const staffList = staffRes.data?.data || staffRes.data?.staff || [];
      setNurses(staffList.filter((s: any) => s.role === 'NURSE' || s.user?.role === 'NURSE'));
    } catch (err) {
      console.error(err);
      setError('Failed to load triage lookup data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint || !triageLevel) return;

    if (isRegistered && !patientId) {
      alert('Please select a registered patient profile.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const symptomsArray = symptomsInput
        ? symptomsInput.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload = {
        patientId: isRegistered ? patientId : undefined,
        patientName: !isRegistered ? patientName || 'Unknown Patient' : undefined,
        patientAge: !isRegistered && patientAge ? Number(patientAge) : undefined,
        patientGender: !isRegistered ? patientGender : undefined,
        patientPhone: !isRegistered && patientPhone ? patientPhone : undefined,
        broughtBy: broughtBy || undefined,
        triageLevel,
        chiefComplaint,
        symptoms: symptomsArray,
        mechanismOfInjury: mechanismOfInjury || undefined,
        bpSystolic: bpSystolic ? Number(bpSystolic) : undefined,
        bpDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
        pulse: pulse ? Number(pulse) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
        spo2: spo2 ? Number(spo2) : undefined,
        gcsScore: gcsScore ? Number(gcsScore) : undefined,
        assignedNurseId: assignedNurseId || undefined
      };

      const res = await api.post('/api/v1/emergency', payload);
      if (res.data?.success) {
        router.push(`/emergency/${res.data.data.id}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to initialize emergency case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'NURSE', 'DOCTOR']}>
      <div className="space-y-8 max-w-4xl mx-auto font-semibold text-xs text-slate-700">
        
        {/* Header Actions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back
          </button>
          <span className="text-xs font-semibold text-slate-400">ER Triage Intake</span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 flex items-center gap-2.5 font-bold">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3 bg-white border border-slate-200/80 rounded-3xl">
            <div className="h-8 w-8 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
            <span>Loading intakes lookup...</span>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-8">
            
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Activity className="h-5.5 w-5.5 text-red-600" />
                Rapid Emergency Intake Form
              </h2>
              <p className="text-slate-450 font-semibold mt-0.5 font-semibold">Triage patients immediately. Fall back to placeholder tags if patient identity is unknown.</p>
            </div>

            {/* Registration toggle */}
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 border border-slate-200 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setIsRegistered(true)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer',
                  isRegistered ? 'bg-white text-slate-800 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Registered Patient
              </button>
              <button
                type="button"
                onClick={() => setIsRegistered(false)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer',
                  !isRegistered ? 'bg-white text-slate-800 shadow-sm border border-slate-150' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                Unregistered / Unknown Patient
              </button>
            </div>

            {/* Patient Selector or Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {isRegistered ? (
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Select Patient Profile *</label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.patientNumber})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Temporary Patient Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Unknown Male Gold Jacket"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Estimated Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 45"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-650 mb-1.5">Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              )}

            </div>

            {/* Triage & complaint */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">ESI Triage Level *</label>
                <select
                  required
                  value={triageLevel}
                  onChange={(e) => setTriageLevel(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                >
                  <option value="IMMEDIATE">Level 1 - IMMEDIATE (Red)</option>
                  <option value="EMERGENT">Level 2 - EMERGENT (Orange)</option>
                  <option value="URGENT">Level 3 - URGENT (Yellow)</option>
                  <option value="LESS_URGENT">Level 4 - LESS URGENT (Green)</option>
                  <option value="NON_URGENT">Level 5 - NON URGENT (Blue)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Brought By</label>
                <input
                  type="text"
                  placeholder="e.g. Bystander, Ambulance 108"
                  value={broughtBy}
                  onChange={(e) => setBroughtBy(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Duty Nurse Assigned</label>
                <select
                  value={assignedNurseId}
                  onChange={(e) => setAssignedNurseId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                >
                  <option value="">-- Assign Duty Nurse (Optional) --</option>
                  {nurses.map((n: any) => (
                    <option key={n.userId || n.id} value={n.userId || n.id}>
                      {n.firstName || n.user?.firstName} {n.lastName || n.user?.lastName}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Chief Complaint *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Severe chest crushing pain, lacerations"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Mechanism of Injury (trauma details)</label>
                <input
                  type="text"
                  placeholder="e.g. Road accident, fall from height"
                  value={mechanismOfInjury}
                  onChange={(e) => setMechanismOfInjury(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

            </div>

            <div>
              <label className="block text-xs font-bold text-slate-650 mb-1.5">Symptoms (comma-separated list)</label>
              <input
                type="text"
                placeholder="e.g. unconscious, sweating, chest_pain"
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Vitals signs */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Initial Arrival Vital Signs</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 font-semibold text-xs text-slate-700">
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">BP Systolic</label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">BP Diastolic</label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 37.0"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">GCS Score (3-15)</label>
                  <input
                    type="number"
                    min={3}
                    max={15}
                    placeholder="e.g. 15"
                    value={gcsScore}
                    onChange={(e) => setGcsScore(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-red-500 text-center"
                  />
                </div>

              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-650/15 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Register Emergency Intake'}
              </button>
            </div>

          </form>
        )}

      </div>
    </DashboardLayout>
  );
}
