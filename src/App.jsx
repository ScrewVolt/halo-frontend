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

import { Toaster } from "react-hot-toast";

export default function App() {
  const [user, setUser] = useState(undefined); // initially undefined (checking)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (user === undefined) {
    // Loading state while checking
    return (
      <div className="h-screen flex items-center justify-center text-blue-700 text-xl font-semibold">
        Checking login...
      </div>
    );
  }

  if (!user) {
    // Not logged in, show login modal
    return <LoginModal onLogin={setUser} />;
  }

  return (
    <>
      <Toaster
        toastOptions={{
          style: {
            background: "#fff",
            color: "#333",
            fontSize: "14px",
            padding: "12px",
          },
        }}
      />

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

        {/* Fallback: if user manually types unknown route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
