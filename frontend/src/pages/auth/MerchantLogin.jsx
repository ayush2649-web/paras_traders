import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiLock, FiUser, FiShoppingBag } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import {
    getDefaultPostLoginPath,
    getEmployeeHomePath,
    isEmployeeUser,
} from '../../utils/roleAccess';
import './Auth.css';

export default function MerchantLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, login, logout } = useAuth();

    if (user) {
        if (user.is_superuser || user.is_staff) {
            // Admin is logged in
        } else if (isEmployeeUser(user)) {
            return <Navigate to={getEmployeeHomePath(user) || '/employee/merchant/inventory'} replace />;
        } else {
            return <Navigate to={getDefaultPostLoginPath(user)} replace />;
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Admin already logged in
        if (user?.is_superuser || user?.is_staff) {
            window.location.replace('/employee/merchant/inventory');
            return;
        }

        setLoading(true);
        try {
            const data = await login(username, password);
            const loggedInUser = data?.user;

            if (loggedInUser?.is_superuser || loggedInUser?.is_staff) {
                toast.success('Admin login successful');
                window.location.replace('/employee/merchant/inventory');
                return;
            }

            if (!isEmployeeUser(loggedInUser)) {
                logout();
                toast.error('This is the Merchant portal. Use Customer Login.');
                return;
            }

            // Verify they have merchant access
            if (loggedInUser?.profile?.employee_role !== 'merchant_partner') {
                 logout();
                 toast.error('Role mismatch. You are not registered as a Merchant Partner.');
                 return;
            }

            toast.success('Merchant login successful');
            window.location.replace('/employee/merchant/inventory');
        } catch (err) {
            const message = err?.error
                || err?.detail
                || err.response?.data?.error
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
                <div className="auth-header" style={{textAlign: 'center'}}>
                    <FiShoppingBag style={{fontSize: '3rem', color: '#e94560', marginBottom: '1rem'}}/>
                    <h1>{isAdminLoggedIn ? 'Merchant Portal' : 'Merchant Login'}</h1>
                    <p>{isAdminLoggedIn
                        ? `Logged in as ${user.username} (Admin)`
                        : 'Access your Merchant Inventory and Analytics dashboard'}
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
                    
                    <button type="submit" className="btn-auth" disabled={loading} style={{marginTop: '1.5rem'}}>
                        {isAdminLoggedIn ? 'Open Dashboard' : (loading ? 'Signing In...' : 'Sign In')}
                    </button>
                </form>
                <p className="auth-footer auth-footer-secondary" style={{marginTop: '2rem'}}>
                    Not a merchant? <Link to="/sell" style={{color: '#e94560'}}>Apply Here</Link>
                </p>
            </div>
        </div>
    );
}
