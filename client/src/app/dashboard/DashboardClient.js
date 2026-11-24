'use client';

import RequireAuth from '@/components/RequireAuth';
import CandidateDashboard from '@/components/dashboard/CandidateDashboard';
import EmployerDashboard from '@/components/dashboard/EmployerDashboard';

export default function DashboardClient() {
  return (
    <RequireAuth>
      {(user) => (
        <div className="container-page py-8">
          {user.role === 'employer' ? <EmployerDashboard user={user} /> : <CandidateDashboard user={user} />}
        </div>
      )}
    </RequireAuth>
  );
}
