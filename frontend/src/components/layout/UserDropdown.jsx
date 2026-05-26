import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiUser, FiLogOut, FiPackage, FiHeart, FiAward, FiCpu, FiMapPin,
    FiGrid, FiArchive, FiUsers, FiShield, FiTruck
} from 'react-icons/fi';

export default function UserDropdown({
    user,
    onLogout,
    onClose,
    showCustomerPages,
    showSuperAdminPages,
    canDashboardAccess,
    canOrdersAccess,
    canInventoryAccess,
    canShowDeliveryNav,
    showEmployeePortalLink,
    isDeliveryOnlyPartner,
    showInnovationLink,
}) {
    const [open, setOpen] = useState(false);

    const close = () => {
        setOpen(false);
        onClose?.();
    };

    return (
        <div className="user-dropdown">
            <button className="nav-link user-btn" onClick={() => setOpen(!open)}>
                <FiUser />
                <span>{user.first_name || user.username}</span>
            </button>
            {open && (
                <div className="nav-dropdown-menu">
                    <Link to="/profile" onClick={close}><FiUser /> My Profile</Link>
                    <Link to="/profile" onClick={close}><FiPackage /> My Orders</Link>
                    <Link to="/track-order" onClick={close}><FiMapPin /> Order List</Link>

                    {showCustomerPages && (
                        <Link to="/rewards" onClick={close}><FiAward /> Rewards</Link>
                    )}
                    {showInnovationLink && (
                        <Link to="/innovation" onClick={close}><FiCpu /> Innovation</Link>
                    )}
                    {showCustomerPages && (
                        <Link to="/wishlist" onClick={close}><FiHeart /> Wishlist</Link>
                    )}

                    {canDashboardAccess && (
                        <Link to="/employee/dashboard" onClick={close}><FiGrid /> Admin Dashboard</Link>
                    )}
                    {canOrdersAccess && (
                        <Link to="/employee/orders" onClick={close}><FiPackage /> Order Management</Link>
                    )}
                    {canInventoryAccess && (
                        <Link to="/employee/inventory" onClick={close}><FiArchive /> Inventory Management</Link>
                    )}
                    {showEmployeePortalLink && (
                        <Link to="/employee" onClick={close}><FiUsers /> Employee Portal</Link>
                    )}
                    {showSuperAdminPages && (
                        <Link to="/super-admin" onClick={close}><FiShield /> Super Admin</Link>
                    )}
                    {canShowDeliveryNav && (
                        <Link to="/employee/delivery" onClick={close}>
                            <FiTruck /> {isDeliveryOnlyPartner ? 'Delivery Panel' : 'Delivery'}
                        </Link>
                    )}

                    <button className="logout-btn" onClick={() => { onLogout(); close(); }}>
                        <FiLogOut /> Logout
                    </button>
                </div>
            )}
        </div>
    );
}
