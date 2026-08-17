import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { RequireRole } from "./components/RequireRole.js";
import { startAutoSync } from "./services/syncService.js";
import { Login } from "./pages/Login.js";
import { VerifyOtp } from "./pages/VerifyOtp.js";
import { Home } from "./pages/Home.js";
import { CreateEmergency } from "./pages/CreateEmergency.js";
import { EmergencyStatus } from "./pages/EmergencyStatus.js";
import { EmergencyList } from "./pages/EmergencyList.js";
import { IncidentQueue } from "./pages/dashboard/IncidentQueue.js";
import { IncidentDetail } from "./pages/dashboard/IncidentDetail.js";

function AuthedApp() {
  useEffect(() => startAutoSync(), []);
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<CreateEmergency />} />
        <Route path="/emergencies" element={<EmergencyList />} />
        <Route path="/emergencies/:id" element={<EmergencyStatus />} />
        <Route element={<RequireRole roles={["STAFF", "ADMIN"]} />}>
          <Route path="/dashboard" element={<IncidentQueue />} />
          <Route path="/dashboard/incidents/:id" element={<IncidentDetail />} />
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthedApp />
    </AuthProvider>
  );
}
