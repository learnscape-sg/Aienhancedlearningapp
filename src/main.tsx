import './i18n';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { FontSizeProvider } from './contexts/FontSizeContext';
import { FeedbackButton } from './components/shared/FeedbackButton';
import App from './App.tsx';
import { CoursePage } from './components/student/CoursePage';
import { SharedCourseLandingPage } from './components/SharedCourseLandingPage';
import { SharedTwinLandingPage } from './components/shared/SharedTwinLandingPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { AdminPortal } from './components/admin/AdminPortal';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <FontSizeProvider>
    <BrowserRouter>
      <FeedbackButton />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/app" element={<App />} />
        <Route path="/app/:space" element={<App />} />
        <Route path="/shared-course/:token" element={<SharedCourseLandingPage />} />
        <Route path="/shared-twin/:token" element={<SharedTwinLandingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/course/:id" element={<CoursePage />} />
        <Route path="/admin/*" element={<AdminPortal />} />
      </Routes>
    </BrowserRouter>
    </FontSizeProvider>
  </AuthProvider>
);
