import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Routes, Route } from "react-router-dom";
import { auth } from "./firebase";

import Dashboard from "./pages/Dashboard";
import SessionEntry from "./pages/SessionEntry";
import VisitHistory from "./pages/VisitHistory";
import LoginModal from "./components/LoginModal";
import MainLayout from "./layouts/MainLayout";

import { Toaster } from "react-hot-toast";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (!user) return <LoginModal onLogin={setUser} />;

  return (
    <>
      <Toaster />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/visit/:id" element={<VisitHistory />} />
          <Route path="/visit/:id/session/:sessionId" element={<SessionEntry />} />
        </Route>
      </Routes>

    </>
  );
}
