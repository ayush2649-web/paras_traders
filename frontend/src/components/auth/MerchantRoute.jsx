import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { isFullAdminUser, getDefaultPostLoginPath } from '../../utils/roleAccess';

/**
 * Route guard that only allows merchant_partner users (and full admins/superusers).
 */
export default function MerchantRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <div className="page-loader">Loading...</div>;
    if (!user) return <Navigate to="/merchant" replace />;

    const isMerchant = user?.profile?.employee_role === 'merchant_partner';
    const isAdmin = isFullAdminUser(user);

    if (!isMerchant && !isAdmin) {
        return <Navigate to={getDefaultPostLoginPath(user)} replace />;
    }

    return children;
}
