import { useEffect, useRef } from "react";
import { auth } from "../firebase";
import toast from "react-hot-toast";

const AUTO_LOGOUT_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

export default function useAutoLogout() {
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      auth.signOut();
      toast.error("Session expired. Please login again.");
    }, AUTO_LOGOUT_TIME);
  };

  useEffect(() => {
    // Reset timer on any of these user actions
    const events = ["mousemove", "keydown", "click", "scroll"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer(); // start the timer initially

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
