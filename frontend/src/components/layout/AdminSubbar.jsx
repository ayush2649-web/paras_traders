import { NavLink, useLocation } from 'react-router-dom';
import { FiGrid, FiShield, FiUsers, FiUser, FiArchive, FiPackage, FiTruck, FiShoppingBag } from 'react-icons/fi';

export default function AdminSubbar({
    canDashboardAccess,
    canOrdersAccess,
    canInventoryAccess,
    canShowDeliveryNav,
    showSuperAdminPages,
    onNavClick,
}) {
    const location = useLocation();
    const currentView = new URLSearchParams(location.search).get('view');

    return (
        <div className="admin-subbar">
            <div className="admin-subbar-inner">
                <span className="admin-subbar-title">
                    <FiShield /> Admin Menu
                </span>

                {canDashboardAccess && (
                    <NavLink
                        to="/employee/dashboard"
                        className={({ isActive }) => `admin-subbar-link ${isActive ? 'active' : ''}`}
                        onClick={onNavClick}
                    >
                        <FiGrid /> Dashboard
                    </NavLink>
                )}

                {showSuperAdminPages && (
                    <>
                        <NavLink
                            to="/super-admin?view=admins"
                            className={({ isActive }) => `admin-subbar-link ${isActive && currentView === 'admins' ? 'active' : ''}`}
                            onClick={onNavClick}
                        >
                            <FiShield /> Admin
                        </NavLink>
                        <NavLink
                            to="/super-admin?view=merchants"
                            className={({ isActive }) => `admin-subbar-link ${isActive && currentView === 'merchants' ? 'active' : ''}`}
                            onClick={onNavClick}
                        >
                            <FiShoppingBag /> Merchant
                        </NavLink>
                        <NavLink
                            to="/super-admin?view=employees"
                            className={({ isActive }) => `admin-subbar-link ${isActive && currentView === 'employees' ? 'active' : ''}`}
                            onClick={onNavClick}
                        >
                            <FiUsers /> Employee
                        </NavLink>
                        <NavLink
                            to="/super-admin?view=users"
                            className={({ isActive }) => `admin-subbar-link ${isActive && currentView === 'users' ? 'active' : ''}`}
                            onClick={onNavClick}
                        >
                            <FiUser /> Customer
                        </NavLink>
                    </>
                )}

                {canInventoryAccess && (
                    <NavLink
                        to="/employee/inventory"
                        className={({ isActive }) => `admin-subbar-link ${isActive ? 'active' : ''}`}
                        onClick={onNavClick}
                    >
                        <FiArchive /> Inventory
                    </NavLink>
                )}

                {canOrdersAccess && (
                    <NavLink
                        to="/employee/orders"
                        className={({ isActive }) => `admin-subbar-link ${isActive ? 'active' : ''}`}
                        onClick={onNavClick}
                    >
                        <FiPackage /> Orders
                    </NavLink>
                )}

                {canShowDeliveryNav && (
                    <NavLink
                        to="/employee/delivery"
                        className={({ isActive }) => `admin-subbar-link ${isActive ? 'active' : ''}`}
                        onClick={onNavClick}
                    >
                        <FiTruck /> Delivery
                    </NavLink>
                )}
            </div>
        </div>
    );
}
