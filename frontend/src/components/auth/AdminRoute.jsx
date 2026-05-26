import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
    canAccessAdminModule,
    getDefaultPostLoginPath,
    getEmployeeHomePath,
    isEmployeeUser,
} from '../../utils/roleAccess';

export default function AdminRoute({ children, requiredModule = null }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="page-loader">Loading...</div>;
    if (!user) return <Navigate to="/employee/login" replace />;

    const employeeAccount = isEmployeeUser(user);
    const employeeHomePath = getEmployeeHomePath(user);

    if (employeeAccount && employeeHomePath && location.pathname !== employeeHomePath) {
        return <Navigate to={employeeHomePath} replace />;
    }

    if (!employeeAccount && !user.is_staff && !user.is_superuser) {
        return <Navigate to={getDefaultPostLoginPath(user)} replace />;
    }

    if (requiredModule && !canAccessAdminModule(user, requiredModule)) {
        return <Navigate to={(employeeAccount && employeeHomePath) ? employeeHomePath : getDefaultPostLoginPath(user)} replace />;
    }

    return children;
}
