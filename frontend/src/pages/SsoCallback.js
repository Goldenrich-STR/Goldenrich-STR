import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const SsoCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { acceptToken } = useAuth();
  const [error, setError] = useState(searchParams.get("error"));

  useEffect(() => {
    const token = searchParams.get("token");
    const redirect = searchParams.get("redirect") || "/dashboard";

    if (!token) {
      setError((current) => current || "Missing SSO token");
      return;
    }

    acceptToken(token)
      .then(() => navigate(redirect, { replace: true }))
      .catch(() => setError("Unable to complete SSO login"));
  }, [acceptToken, navigate, searchParams]);

  if (error) {
    return <Navigate to={`/login?sso_error=${encodeURIComponent(error)}`} replace />;
  }

  return (
    <div className="min-h-screen bg-stone flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta mx-auto mb-4"></div>
        <p className="text-charcoal-light">Signing you in...</p>
      </div>
    </div>
  );
};

export default SsoCallback;
