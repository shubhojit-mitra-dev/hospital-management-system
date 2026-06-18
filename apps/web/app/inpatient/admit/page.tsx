'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, User, Activity, AlertCircle, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function AdmitPatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryWardId = searchParams.get('wardId') || '';
  const queryBedId = searchParams.get('bedId') || '';

  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);

  // Selected values
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [wardId, setWardId] = useState(queryWardId);
  const [bedId, setBedId] = useState(queryBedId);
  const [admissionType, setAdmissionType] = useState('PLANNED');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState('');
  const [primaryNurseId, setPrimaryNurseId] = useState('');
  const [attendantName, setAttendantName] = useState('');
  const [attendantPhone, setAttendantPhone] = useState('');
  const [attendantRelation, setAttendantRelation] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadDependencies = async () => {
    setLoading(true);
    setError('');
    try {
      const [patRes, docRes, wardRes, staffRes] = await Promise.all([
        api.get('/api/v1/patients'),
        api.get('/api/v1/doctors'),
        api.get('/api/v1/inpatient/availability'),
        api.get('/api/v1/staff')
      ]);

      setPatients(patRes.data?.patients || patRes.data?.data || []);
      setDoctors(docRes.data?.data || docRes.data?.doctors || []);
      setWards(wardRes.data?.data?.wards || []);
      setStaff(staffRes.data?.data || staffRes.data?.staff || []);

      // If we have query parameters, fetch the specific ward detail to get beds list
      if (queryWardId) {
        const wardDetail = await api.get(`/api/v1/inpatient/wards/${queryWardId}`);
        setBeds(wardDetail.data?.data?.beds?.filter((b: any) => b.status === 'AVAILABLE' || b.id === queryBedId) || []);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to load form lookup data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  // Update beds selection when ward changes
  const handleWardChange = async (selectedId: string) => {
    setWardId(selectedId);
    setBedId('');
    if (!selectedId) {
      setBeds([]);
      return;
    }
    try {
      const res = await api.get(`/api/v1/inpatient/wards/${selectedId}`);
      // Show available beds only
      setBeds(res.data?.data?.beds?.filter((b: any) => b.status === 'AVAILABLE') || []);
    } catch (err) {
      console.error('Failed to fetch beds for ward', err);
    }
  };

  // Set departmentId automatically based on doctor selected
  const handleDoctorChange = (selectedId: string) => {
    setDoctorId(selectedId);
    const doctorObj = doctors.find((d: any) => d.id === selectedId);
    if (doctorObj) {
      setDepartmentId(doctorObj.departmentId);
    } else {
      setDepartmentId('');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId || !departmentId || !wardId || !bedId) {
      alert('Please fill out all required fields.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        patientId,
        doctorId,
        departmentId,
        wardId,
        bedId,
        admissionType,
        chiefComplaint: chiefComplaint || undefined,
        admissionDiagnosis: admissionDiagnosis || undefined,
        primaryNurseId: primaryNurseId || undefined,
        attendantName: attendantName || undefined,
        attendantPhone: attendantPhone || undefined,
        attendantRelation: attendantRelation || undefined
      };

      const res = await api.post('/api/v1/inpatient/admissions', payload);
      if (res.data?.success) {
        router.push(`/inpatient/${res.data.data.id}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to authorize inpatient admission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR']}>
      <div className="space-y-8 max-w-4xl mx-auto">
        
        {/* Header Actions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Back
          </button>
          <span className="text-xs font-semibold text-slate-400">Step 1 of 1: Admission Profile</span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 flex items-center gap-2.5 font-bold text-xs">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-500 gap-3 bg-white border border-slate-200/80 rounded-3xl">
            <div className="h-8 w-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <span>Loading lookup contexts...</span>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8 space-y-8 font-semibold text-xs text-slate-700">
            
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FileText className="h-5.5 w-5.5 text-teal-650" />
                Inpatient Admission Request
              </h2>
              <p className="text-slate-400 font-semibold mt-0.5">Please provide patient demographic, clinical diagnostics, and room assignment parameters.</p>
            </div>

            {/* Patients & Doctors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Select Patient *</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.patientNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Attending Doctor *</label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Attending Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user?.firstName} {d.user?.lastName} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Wards & Beds */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Ward / Room Type *</label>
                <select
                  required
                  value={wardId}
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
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Available Bed *</label>
                <select
                  required
                  value={bedId}
                  onChange={(e) => setBedId(e.target.value)}
                  disabled={!wardId}
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

              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Primary Nurse Assigned</label>
                <select
                  value={primaryNurseId}
                  onChange={(e) => setPrimaryNurseId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Staff Nurse (Optional) --</option>
                  {staff
                    .filter((s: any) => s.role === 'NURSE' || s.user?.role === 'NURSE')
                    .map((s: any) => (
                      <option key={s.userId || s.id} value={s.userId || s.id}>
                        {s.firstName || s.user?.firstName} {s.lastName || s.user?.lastName}
                      </option>
                    ))}
                </select>
              </div>

            </div>

            {/* Admission Type & Clinic details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
              
              <div>
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Admission Type *</label>
                <select
                  required
                  value={admissionType}
                  onChange={(e) => setAdmissionType(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="PLANNED">Planned</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="POST_OP">Post-Operative</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-650 mb-1.5">Chief Complaint</label>
                <input
                  type="text"
                  placeholder="e.g. Chronic shortness of breath, acute abdomen"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

            </div>

            <div>
              <label className="block text-xs font-bold text-slate-650 mb-1.5">Clinical Admission Diagnosis</label>
              <textarea
                rows={3}
                placeholder="Initial diagnosis findings..."
                value={admissionDiagnosis}
                onChange={(e) => setAdmissionDiagnosis(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Attendant / Attendant Details */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Companion / Attendant Contact Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Attendant Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Kapoor"
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Attendant Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +919988776655"
                    value={attendantPhone}
                    onChange={(e) => setAttendantPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-650 mb-1.5">Relationship to Patient</label>
                  <input
                    type="text"
                    placeholder="e.g. Brother, Spouse, Father"
                    value={attendantRelation}
                    onChange={(e) => setAttendantRelation(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-teal-500"
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
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-650/15 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Admitting...' : 'Register Inpatient Admission'}
              </button>
            </div>

          </form>
        )}

      </div>
    </DashboardLayout>
  );
}
