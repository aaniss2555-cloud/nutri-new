import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getProfile } from "./services/Auth";

function ProtectedRoute({ allowedRole, children }) {
  const token = localStorage.getItem("access");
  const [profile, setProfile] = useState(token ? undefined : null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await getProfile();

        if (!cancelled) {
          setProfile(response.data);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (profile === undefined) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && profile.role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
