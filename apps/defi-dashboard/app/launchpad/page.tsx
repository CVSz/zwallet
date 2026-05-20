'use client';
import React from 'react';
import NextDynamic from 'next/dynamic';

const LaunchpadContent = NextDynamic(() => import("../components/LaunchpadContent"), { ssr: false });

export const dynamic = "force-dynamic";

export default function LaunchpadPage() {
  return <LaunchpadContent />;
}
