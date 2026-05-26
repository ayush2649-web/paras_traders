import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import SearchBar from './SearchBar';
import UserDropdown from './UserDropdown';
import AdminSubbar from './AdminSubbar';
import {
    FiShoppingCart, FiUser, FiMenu, FiX,
    FiHeart, FiGrid, FiTruck, FiAward, FiCpu, FiMapPin, FiUsers
} from 'react-icons/fi';
import { canAccessAdminModule, canAccessDeliveryPanel } from '../../utils/roleAccess';
import './Navbar.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { cartCount } = useCart();
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();

    // ─── Role-based access flags ──────────────────────────────────
    const isSuperAdmin = Boolean(user?.is_superuser);
    const canDashboardAccess = canAccessAdminModule(user, 'dashboard');
    const canOrdersAccess = canAccessAdminModule(user, 'orders');
    const canInventoryAccess = canAccessAdminModule(user, 'inventory');
    const hasAnyAdminAccess = canDashboardAccess || canOrdersAccess || canInventoryAccess;
    const canDeliveryAccess = canAccessDeliveryPanel(user);
    const isDeliveryOnlyPartner = canDeliveryAccess && !hasAnyAdminAccess && !isSuperAdmin;
    const isCustomer = Boolean(user) && !hasAnyAdminAccess && !canDeliveryAccess && !isSuperAdmin;
    const canShowDeliveryNav = canDeliveryAccess && !isSuperAdmin;
    const showEmployeePortalLink = Boolean(user) && !isSuperAdmin && (canDashboardAccess || canOrdersAccess || canInventoryAccess || canDeliveryAccess);
    const showCustomerPages = isCustomer || isSuperAdmin;
    const showSuperAdminPages = isSuperAdmin;
    const showAdminSubbar = hasAnyAdminAccess || isSuperAdmin;
    const showInnovationLink = hasAnyAdminAccess || isSuperAdmin;

    const closeMobile = () => setMobileOpen(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleNavClick = () => setMobileOpen(false);

    return (
        <nav className="navbar-main">
            <div className="navbar-container">
                {/* ── Brand ── */}
                <Link to="/" className="navbar-brand">
                    <span className="brand-icon">PT</span>
                    <span className="brand-text">Paras Traders</span>
                </Link>

                {/* ── Search ── */}
                <SearchBar onSearch={closeMobile} />

                {/* ── Nav Links ── */}
                <div className={`navbar-actions ${mobileOpen ? 'open' : ''}`}>
                    <Link to="/products" className="nav-link" onClick={closeMobile}>
                        <FiGrid /> <span>Products</span>
                    </Link>

                    {canShowDeliveryNav && !showAdminSubbar && (
                        <Link to="/employee/delivery" className="nav-link" onClick={closeMobile}>
                            <FiTruck /> <span>{isDeliveryOnlyPartner ? 'Delivery' : 'Delivery Panel'}</span>
                        </Link>
                    )}

                    {showCustomerPages && (
                        <Link to="/wishlist" className="nav-link" onClick={closeMobile}>
                            <FiHeart /> <span>Wishlist</span>
                        </Link>
                    )}

                    {showCustomerPages && (
                        <Link to="/rewards" className="nav-link" onClick={closeMobile}>
                            <FiAward /> <span>Rewards</span>
                        </Link>
                    )}

                    {showInnovationLink && (
                        <Link to="/innovation" className="nav-link" onClick={closeMobile}>
                            <FiCpu /> <span>Innovation</span>
                        </Link>
                    )}

                    <Link to="/cart" className="nav-link cart-link" onClick={closeMobile}>
                        <FiShoppingCart />
                        <span>Cart</span>
                        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                    </Link>

                    {user && (
                        <Link to="/track-order" className="nav-link" onClick={closeMobile}>
                            <FiMapPin /> <span>Order List</span>
                        </Link>
                    )}

                    {showEmployeePortalLink && (
                        <Link to="/employee" className="nav-link" onClick={closeMobile}>
                            <FiUsers /> <span>Employee</span>
                        </Link>
                    )}

                    {/* ── Auth Section ── */}
                    {user ? (
                        <UserDropdown
                            user={user}
                            onLogout={handleLogout}
                            onClose={closeMobile}
                            showCustomerPages={showCustomerPages}
                            showSuperAdminPages={showSuperAdminPages}
                            canDashboardAccess={canDashboardAccess}
                            canOrdersAccess={canOrdersAccess}
                            canInventoryAccess={canInventoryAccess}
                            canShowDeliveryNav={canShowDeliveryNav}
                            showEmployeePortalLink={showEmployeePortalLink}
                            isDeliveryOnlyPartner={isDeliveryOnlyPartner}
                            showInnovationLink={showInnovationLink}
                        />
                    ) : (
                        <div className="auth-links">
                            <Link to="/login" className="nav-link" onClick={closeMobile}>
                                <FiUser /> <span>Login</span>
                            </Link>
                            <Link to="/register" className="btn-signup" onClick={closeMobile}>
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>

                {/* ── Mobile Toggle ── */}
                <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <FiX /> : <FiMenu />}
                </button>
            </div>

            {/* ── Admin Subbar ── */}
            {showAdminSubbar && (
                <AdminSubbar
                    canDashboardAccess={canDashboardAccess}
                    canOrdersAccess={canOrdersAccess}
                    canInventoryAccess={canInventoryAccess}
                    canShowDeliveryNav={canShowDeliveryNav}
                    showSuperAdminPages={showSuperAdminPages}
                    onNavClick={handleNavClick}
                />
            )}
        </nav>
    );
}
