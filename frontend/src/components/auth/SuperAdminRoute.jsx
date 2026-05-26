import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getDefaultPostLoginPath } from '../../utils/roleAccess';

export default function SuperAdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="page-loader">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (!user.is_superuser) {
        return <Navigate to={getDefaultPostLoginPath(user)} />;
    }

    return children;
}
