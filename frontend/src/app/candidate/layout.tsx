import { CandidateTier } from "@/components/cv/CandidateTier";
import React from "react";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["CANDIDATE"]}>
      <CandidateTier />
      {children}
    </RoleGuard>
  );
}
