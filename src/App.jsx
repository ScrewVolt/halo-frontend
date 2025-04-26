import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";

import Dashboard from "./pages/Dashboard";
import SessionEntry from "./pages/SessionEntry";
import VisitHistory from "./pages/VisitHistory";
import LoginModal from "./components/LoginModal";
import MainLayout from "./layouts/MainLayout";
import RequireAuth from "./components/RequireAuth";
import useAutoLogout from "./hooks/useAutoLogout";  // ✅ Add this


import { Toaster } from "react-hot-toast";

export default function App() {
  useAutoLogout();
  const [user, setUser] = useState(undefined); // initially undefined (checking)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            padding: "14px",
            fontSize: "14px",
            color: "#1e40af", // Tailwind blue-800
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
          },
          success: {
            style: {
              background: "#e0f2fe", // Light blue success
              color: "#075985",       // Darker blue text
              border: "1px solid #7dd3fc",
            },
          },
          error: {
            style: {
              background: "#fee2e2", // Light red error
              color: "#991b1b",       // Darker red text
              border: "1px solid #fca5a5",
            },
          },
        }}
      />


      {user === undefined ? (
        <div className="h-screen flex items-center justify-center text-blue-700 text-xl font-semibold">
          Checking login...
        </div>
      ) : !user ? (
        <LoginModal onLogin={setUser} />
      ) : (
        <Routes>
          {/* All protected under MainLayout */}
          <Route
            element={
              <RequireAuth>
                <MainLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/visit/:id" element={<VisitHistory />} />
            <Route path="/visit/:id/session/:sessionId" element={<SessionEntry />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
