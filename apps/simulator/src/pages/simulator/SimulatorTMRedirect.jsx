import { Navigate } from 'react-router-dom';

/** Deprecated TM dashboard — redirect to role selection (v734). */
export default function SimulatorTMRedirect() {
  return <Navigate to="/simulator/role-selection" replace />;
}
