'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ShieldAlert, User, Briefcase, Stethoscope } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

interface Department {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export default function CreateStaffPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dropdown lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Form State
  const [role, setRole] = useState('NURSE');
  
  // User Account Form
  const [accountForm, setAccountForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  // Professional Profile Form (shared schema fields + doctor specific)
  const [profileForm, setProfileForm] = useState({
    departmentId: '',
    designation: '',
    qualification: '',
    experienceYears: '',
    joinDate: new Date().toISOString().split('T')[0],
    
    // Doctor specific
    registrationNo: '',
    specialization: '',
    subSpecialization: '',
    consultationFee: '500',
    followUpFee: '250',
    slotDurationMins: '30',

    // Nurse specific
    assignedDoctorId: '',
    wardAssignment: '',
  });

  const fetchLists = async () => {
    try {
      if (!currentUser?.hospitalId) return;
      const [deptRes, docRes] = await Promise.all([
        api.get(`/api/v1/hospitals/${currentUser.hospitalId}/departments`),
        api.get('/api/v1/doctors'), // List existing doctors
      ]);
      setDepartments(deptRes.data || []);
      setDoctors(docRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [currentUser]);

  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccountForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Create User account via admin endpoint
      const userPayload = {
        ...accountForm,
        role,
        hospitalId: currentUser?.hospitalId,
      };

      const userRes = await api.post('/api/v1/admin/users', userPayload);
      const createdUserId = userRes.data.userId;

      if (!createdUserId) {
        throw new Error('Failed to retrieve created User ID.');
      }

      // Step 2: Create Professional Profile based on role
      if (role === 'DOCTOR') {
        const docPayload = {
          userId: createdUserId,
          departmentId: profileForm.departmentId,
          registrationNo: profileForm.registrationNo,
          specialization: profileForm.specialization,
          subSpecialization: profileForm.subSpecialization || null,
          qualification: profileForm.qualification,
          experienceYears: profileForm.experienceYears ? parseInt(profileForm.experienceYears) : 0,
          consultationFee: parseFloat(profileForm.consultationFee),
          followUpFee: parseFloat(profileForm.followUpFee),
          slotDurationMins: parseInt(profileForm.slotDurationMins),
        };
        await api.post('/api/v1/doctors', docPayload);
      } else {
        const staffPayload = {
          userId: createdUserId,
          departmentId: profileForm.departmentId || null,
          designation: profileForm.designation || role.replace('_', ' '),
          qualification: profileForm.qualification || null,
          experienceYears: profileForm.experienceYears ? parseInt(profileForm.experienceYears) : 0,
          assignedDoctorId: role === 'NURSE' && profileForm.assignedDoctorId ? profileForm.assignedDoctorId : null,
          wardAssignment: role === 'NURSE' && profileForm.wardAssignment ? profileForm.wardAssignment : null,
          joinDate: profileForm.joinDate || null,
        };
        await api.post('/api/v1/staff', staffPayload);
      }

      router.push('/admin/staff');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to onboard staff member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout allowedRoles={['HOSPITAL_ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Onboard Staff Member</h1>
            <p className="text-sm text-slate-500 font-semibold mt-0.5">Register new staff accounts and professional files.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 font-semibold text-sm flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-5 w-5 text-teal-600" />
              Account credentials
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={accountForm.firstName}
                  onChange={handleAccountChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={accountForm.lastName}
                  onChange={handleAccountChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Role Type</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="LAB_TECHNICIAN">Lab Technician</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="BILLING_EXECUTIVE">Billing Executive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={accountForm.email}
                  onChange={handleAccountChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={accountForm.phone}
                  onChange={handleAccountChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Professional Credentials (Doctor vs Staff Specific) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              {role === 'DOCTOR' ? (
                <>
                  <Stethoscope className="h-5 w-5 text-teal-600" />
                  Doctor Professional Details
                </>
              ) : (
                <>
                  <Briefcase className="h-5 w-5 text-teal-600" />
                  Staff Professional Details
                </>
              )}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Department Assignment</label>
                <select
                  name="departmentId"
                  value={profileForm.departmentId}
                  onChange={handleProfileChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Qualification</label>
                <input
                  type="text"
                  name="qualification"
                  placeholder="e.g. MBBS, MD or B.Sc Nursing"
                  value={profileForm.qualification}
                  onChange={handleProfileChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Experience (Years)</label>
                <input
                  type="number"
                  name="experienceYears"
                  value={profileForm.experienceYears}
                  onChange={handleProfileChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                />
              </div>

              {role === 'DOCTOR' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Medical Council Reg No *</label>
                    <input
                      type="text"
                      name="registrationNo"
                      value={profileForm.registrationNo}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Primary Specialization *</label>
                    <input
                      type="text"
                      name="specialization"
                      placeholder="e.g. Cardiology"
                      value={profileForm.specialization}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Sub-Specialization</label>
                    <input
                      type="text"
                      name="subSpecialization"
                      placeholder="e.g. Interventional Cardiology"
                      value={profileForm.subSpecialization}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Consultation Fee (₹) *</label>
                    <input
                      type="number"
                      name="consultationFee"
                      value={profileForm.consultationFee}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Follow-up Fee (₹) *</label>
                    <input
                      type="number"
                      name="followUpFee"
                      value={profileForm.followUpFee}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Slot Duration (Mins) *</label>
                    <select
                      name="slotDurationMins"
                      value={profileForm.slotDurationMins}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                      required
                    >
                      <option value="15">15 Minutes</option>
                      <option value="20">20 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Designation</label>
                    <input
                      type="text"
                      name="designation"
                      placeholder="e.g. Senior Staff Nurse"
                      value={profileForm.designation}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Join Date</label>
                    <input
                      type="date"
                      name="joinDate"
                      value={profileForm.joinDate}
                      onChange={handleProfileChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                    />
                  </div>

                  {role === 'NURSE' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assigned Supervising Doctor</label>
                        <select
                          name="assignedDoctorId"
                          value={profileForm.assignedDoctorId}
                          onChange={handleProfileChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                        >
                          <option value="">None / Select Doctor</option>
                          {doctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              Dr. {doc.user.firstName} {doc.user.lastName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Ward Assignment</label>
                        <input
                          type="text"
                          name="wardAssignment"
                          placeholder="e.g. ICU, General Ward A"
                          value={profileForm.wardAssignment}
                          onChange={handleProfileChange}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold transition"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-teal-600/10 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Onboard Member'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
