'use client';
import React from 'react';
import NextDynamic from 'next/dynamic';

const AdminDashboardContent = NextDynamic(() => import("./components/AdminDashboardContent"), { ssr: false });

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}
