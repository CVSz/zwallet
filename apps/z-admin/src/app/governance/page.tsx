'use client';
import React from 'react';
import NextDynamic from 'next/dynamic';

const GovernancePortal = NextDynamic(() => import("../components/GovernancePortal"), { ssr: false });

export const dynamic = "force-dynamic";

export default function GovernancePage() {
  return <GovernancePortal />;
}
