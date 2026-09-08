import React from 'react';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RecruiterNavbar />
      {children}
    </>
  );
}
