import React from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['CANDIDATE']}>
      {children}
    </RoleGuard>
  );
}
