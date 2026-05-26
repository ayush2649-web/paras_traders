import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getDefaultPostLoginPath, getEmployeeHomePath, isEmployeeUser } from '../../utils/roleAccess';

export default function EmployeeHomeRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="page-loader">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/employee/login" replace />;
    }

    if (!isEmployeeUser(user)) {
        return <Navigate to={getDefaultPostLoginPath(user)} replace />;
    }

    return <Navigate to={getEmployeeHomePath(user) || '/employee/login'} replace />;
}
