import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const dashboardForUser = (user = {}) => {
  const roleKey = String(user.admin_role_key || user.designation || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  switch (user.role) {
    case "admin":
      return "/admin/dashboard";
    case "host":
      return "/host/dashboard";
    case "broker":
      return "/broker/dashboard";
    case "employee":
      if (roleKey === "telecaller") return "/telecaller/dashboard";
      if (roleKey === "rm" || roleKey === "relationship_manager") return "/broker/dashboard";
      return "/employee/dashboard";
    case "guest":
    default:
      return "/guest/browse";
  }
};

const SsoCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { acceptToken } = useAuth();
  const [error, setError] = useState(searchParams.get("error"));
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    const token = searchParams.get("token");

    if (!token) {
      setError((current) => current || "Missing SSO token");
      return;
    }

    handledRef.current = true;
    acceptToken(token)
      .then((user) => navigate(dashboardForUser(user), { replace: true }))
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
