import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import ScreeningPage from './pages/ScreeningPage';
import VoiceAssessmentPage from './pages/VoiceAssessmentPage';
import HandwritingAssessmentPage from './pages/HandwritingAssessmentPage';
import GaitAssessmentPage from './pages/GaitAssessmentPage';
import ResultPage from './pages/ResultPage';
import { getAuthSession } from './utils/auth';

/**
 * Route guard for Patient Dashboard (/dashboard):
 * - Must NOT be accessible without a logged-in Patient.
 * - If a logged-out user directly opens /dashboard, redirect to /login.
 * - A logged-in Doctor cannot access /dashboard (redirect to /doctor-dashboard).
 */
function PatientDashboardRoute() {
  const session = getAuthSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.role !== 'Patient') {
    return <Navigate to="/doctor-dashboard" replace />;
  }
  return <DashboardPage />;
}

/**
 * Route guard for Doctor Dashboard (/doctor-dashboard):
 * - Must NOT be accessible without a logged-in Doctor.
 * - If a logged-out user directly opens /doctor-dashboard, redirect to /login.
 * - A logged-in Patient cannot access /doctor-dashboard (redirect to /dashboard).
 */
function DoctorDashboardRoute() {
  const session = getAuthSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.role !== 'Doctor') {
    return <Navigate to="/dashboard" replace />;
  }
  return <DoctorDashboardPage />;
}

/**
 * Route guard for Patient assessment/upload workflow:
 * (/screening, /screening/voice, /screening/handwriting, /screening/gait, /screening/result)
 * - Must NOT be accessible without a logged-in Patient.
 * - If a logged-out user directly opens any assessment URL, redirect to /login.
 * - A Doctor must NOT access any patient assessment/upload route (redirect to /doctor-dashboard).
 */
function PatientAssessmentRoute({ children }: { children: React.ReactElement }) {
  const session = getAuthSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.role !== 'Patient') {
    return <Navigate to="/doctor-dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<PatientDashboardRoute />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboardRoute />} />
          <Route path="/dashboard/doctor" element={<DoctorDashboardRoute />} />
          <Route path="/screening" element={<PatientAssessmentRoute><ScreeningPage /></PatientAssessmentRoute>} />
          <Route path="/screening/voice" element={<PatientAssessmentRoute><VoiceAssessmentPage /></PatientAssessmentRoute>} />
          <Route path="/screening/handwriting" element={<PatientAssessmentRoute><HandwritingAssessmentPage /></PatientAssessmentRoute>} />
          <Route path="/screening/gait" element={<PatientAssessmentRoute><GaitAssessmentPage /></PatientAssessmentRoute>} />
          <Route path="/screening/result" element={<PatientAssessmentRoute><ResultPage /></PatientAssessmentRoute>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
