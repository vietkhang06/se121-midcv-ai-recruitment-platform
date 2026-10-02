import React from 'react';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['RECRUITER']}>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col transition-colors w-full min-w-0">
        <RecruiterNavbar />
        <div className="flex-1 w-full min-w-0">
          {children}
        </div>
      </div>
    </RoleGuard>
  );
}
