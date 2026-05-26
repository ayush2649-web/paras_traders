import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiBriefcase, FiLock, FiUser } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import {
    canAccessAdminModule,
    canAccessDeliveryPanel,
    getDefaultPostLoginPath,
    getEmployeeHomePath,
    isEmployeeUser,
} from '../../utils/roleAccess';
import './Auth.css';

const EMPLOYEE_LOGIN_ROLE_OPTIONS = [
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'order_manager', label: 'Order Manager' },
    { value: 'delivery_partner', label: 'Delivery Partner' },
];

const EMPLOYEE_LOGIN_ROLE_LABELS = EMPLOYEE_LOGIN_ROLE_OPTIONS.reduce((acc, roleOption) => {
    acc[roleOption.value] = roleOption.label;
    return acc;
}, {});

const getEmployeeLoginRoleResult = (selectedRole, user) => {
    if (!user || !selectedRole) {
        return { isAllowed: false, redirectPath: null };
    }

    if (selectedRole === 'inventory_manager') {
        return {
            isAllowed: canAccessAdminModule(user, 'inventory'),
            redirectPath: '/employee/inventory',
        };
    }

    if (selectedRole === 'order_manager') {
        return {
            isAllowed: canAccessAdminModule(user, 'orders'),
            redirectPath: '/employee/orders',
        };
    }

    if (selectedRole === 'delivery_partner') {
        return {
            isAllowed: canAccessDeliveryPanel(user),
            redirectPath: '/employee/delivery',
        };
    }

    return { isAllowed: false, redirectPath: null };
};

export default function EmployeeLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginRole, setLoginRole] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, login, logout } = useAuth();

    if (user) {
        if (user.is_superuser || user.is_staff) {
            // Admin is logged in — let them select a role page below
        } else if (isEmployeeUser(user)) {
            return <Navigate to={getEmployeeHomePath(user) || '/employee'} replace />;
        } else {
            return <Navigate to={getDefaultPostLoginPath(user)} replace />;
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!loginRole) {
            toast.error('Please select employee role.');
            return;
        }

        // Admin already logged in — go directly to the selected role page
        if (user?.is_superuser || user?.is_staff) {
            const { redirectPath } = getEmployeeLoginRoleResult(loginRole, user);
            window.location.replace(redirectPath || '/employee/dashboard');
            return;
        }

        setLoading(true);
        try {
            const data = await login(username, password);
            const loggedInUser = data?.user;

            // Admin/superuser can access all employee pages
            if (loggedInUser?.is_superuser || loggedInUser?.is_staff) {
                toast.success('Admin login successful');
                const { redirectPath } = getEmployeeLoginRoleResult(loginRole, loggedInUser);
                window.location.replace(redirectPath || '/employee/dashboard');
                return;
            }

            if (!isEmployeeUser(loggedInUser)) {
                logout();
                toast.error('This is employee login only. Use Customer/Admin Login.');
                return;
            }

            const { isAllowed, redirectPath } = getEmployeeLoginRoleResult(loginRole, loggedInUser);
            if (!isAllowed) {
                logout();
                const selectedRoleLabel = EMPLOYEE_LOGIN_ROLE_LABELS[loginRole] || 'selected role';
                toast.error(`Role mismatch. Use ${selectedRoleLabel} account.`);
                return;
            }

            const assignedPath = getEmployeeHomePath(loggedInUser);
            if (!assignedPath) {
                logout();
                toast.error('No employee page is assigned to this account.');
                return;
            }

            if (redirectPath !== assignedPath) {
                logout();
                const selectedRoleLabel = EMPLOYEE_LOGIN_ROLE_LABELS[loginRole] || 'selected role';
                toast.error(`Role mismatch. ${selectedRoleLabel} is not assigned to this account.`);
                return;
            }

            toast.success('Employee login successful');
            window.location.replace(assignedPath);
        } catch (err) {
            const message = err.response?.data?.error
                || err.response?.data?.detail
                || (err.code === 'ERR_NETWORK' ? 'Cannot reach server. Check backend URL and run server.' : null)
                || (err.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : null)
                || 'Login failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const isAdminLoggedIn = user?.is_superuser || user?.is_staff;

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>{isAdminLoggedIn ? 'Employee Portal' : 'Employee Login'}</h1>
                    <p>{isAdminLoggedIn
                        ? `Logged in as ${user.username} (Admin) — select a role page`
                        : 'Inventory Manager, Order Manager, and Delivery Partner access'}
                    </p>
                </div>
                <form onSubmit={handleSubmit}>
                    {!isAdminLoggedIn && (
                        <>
                            <div className="input-group">
                                <FiUser className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Username or Email"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <FiLock className="input-icon" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}
                    <div className="input-group">
                        <FiBriefcase className="input-icon" />
                        <select
                            value={loginRole}
                            onChange={(e) => setLoginRole(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select employee role</option>
                            {EMPLOYEE_LOGIN_ROLE_OPTIONS.map((roleOption) => (
                                <option key={roleOption.value} value={roleOption.value}>
                                    {roleOption.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="login-role-hint">Choose role to open the related employee page.</p>
                    <button type="submit" className="btn-auth" disabled={loading}>
                        {isAdminLoggedIn ? 'Open Page' : (loading ? 'Signing In...' : 'Sign In')}
                    </button>
                </form>
                <p className="auth-footer auth-footer-secondary">
                    Customer/Admin? <Link to="/login">Go to Main Login</Link>
                </p>
            </div>
        </div>
    );
}
