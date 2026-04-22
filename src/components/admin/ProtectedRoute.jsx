import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const isLoggedIn = localStorage.getItem('isAdminLoggedIn');

  if (!isLoggedIn) {
    return <Navigate to="/admfachini" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;