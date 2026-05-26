import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import {
    canAccessDeliveryPanel,
    getDefaultPostLoginPath,
    getEmployeeHomePath,
    isEmployeeUser,
} from '../../utils/roleAccess';

export default function DeliveryRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="page-loader">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/employee/login" replace />;
    }

    if (!canAccessDeliveryPanel(user)) {
        const employeeHomePath = getEmployeeHomePath(user);
        if (isEmployeeUser(user)) {
            return <Navigate to={employeeHomePath || '/employee/login'} replace />;
        }
        return <Navigate to={getDefaultPostLoginPath(user)} replace />;
    }

    if (isEmployeeUser(user)) {
        const employeeHomePath = getEmployeeHomePath(user);
        if (employeeHomePath && employeeHomePath !== '/employee/delivery') {
            return <Navigate to={employeeHomePath} replace />;
        }
    }

    return children;
}
