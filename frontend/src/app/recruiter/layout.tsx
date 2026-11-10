import React from 'react';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { RecruiterSidebar } from '@/components/recruiter/RecruiterSidebar';

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['RECRUITER']}>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col transition-colors w-full min-w-0">
        <RecruiterNavbar />
        <div className="flex flex-1 w-full min-w-0 items-start">
          <RecruiterSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </RoleGuard>
  );
}
