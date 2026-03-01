import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminCostPage } from './AdminCostPage';
import { AdminPerformancePage } from './AdminPerformancePage';
import { AdminBusinessPage } from './AdminBusinessPage';
import { AdminFeedbackPage } from './AdminFeedbackPage';
import { AdminSettingsPage } from './AdminSettingsPage';
import { AdminDataPage } from './AdminDataPage';

export function AdminPortal() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/cost" element={<AdminCostPage />} />
      <Route path="/performance" element={<AdminPerformancePage />} />
      <Route path="/business" element={<AdminBusinessPage />} />
      <Route path="/feedback" element={<AdminFeedbackPage />} />
      <Route path="/settings" element={<AdminSettingsPage />} />
      <Route path="/data" element={<AdminDataPage />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}
