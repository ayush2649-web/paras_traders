import { Link, Navigate } from 'react-router-dom';
import { FiArchive, FiArrowRight, FiPackage, FiTruck, FiUsers } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import { canAccessAdminModule, canAccessDeliveryPanel } from '../../utils/roleAccess';
import './EmployeePortal.css';

function PortalCard({ icon, title, subtitle, to }) {
    return (
        <Link to={to} className="employee-portal-card">
            <div className="employee-portal-card-icon">{icon}</div>
            <div className="employee-portal-card-content">
                <h3>{title}</h3>
                <p>{subtitle}</p>
            </div>
            <span className="employee-portal-card-link">
                Open <FiArrowRight />
            </span>
        </Link>
    );
}

export default function EmployeePortal() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="page-loader"><div className="spinner"></div></div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    const canOrders = canAccessAdminModule(user, 'orders');
    const canInventory = canAccessAdminModule(user, 'inventory');
    const canDelivery = canAccessDeliveryPanel(user);
    const hasPortalAccess = canOrders || canInventory || canDelivery;

    if (!hasPortalAccess) {
        return <Navigate to="/" />;
    }

    return (
        <div className="employee-portal-page">
            <div className="employee-portal-header">
                <h1><FiUsers /> Employee Portal</h1>
                <p>Common workspace for Inventory Manager, Order Manager, and Delivery Partner.</p>
            </div>

            <div className="employee-portal-grid">
                {canInventory && (
                    <PortalCard
                        icon={<FiArchive />}
                        title="Inventory Manager"
                        subtitle="Manage stock, pricing, and product availability."
                        to="/employee/inventory"
                    />
                )}
                {canOrders && (
                    <PortalCard
                        icon={<FiPackage />}
                        title="Order Manager"
                        subtitle="Process order flow, assignments, and status updates."
                        to="/employee/orders"
                    />
                )}
                {canDelivery && (
                    <PortalCard
                        icon={<FiTruck />}
                        title="Delivery Partner"
                        subtitle="Accept assigned deliveries and verify customer OTP handoff."
                        to="/employee/delivery"
                    />
                )}
            </div>
        </div>
    );
}
