import React from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AdminNavbar } from '@/components/admin/AdminNavbar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <AdminNavbar />
      {children}
    </RoleGuard>
  );
}
