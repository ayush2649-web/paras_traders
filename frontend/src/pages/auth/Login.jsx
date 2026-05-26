import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { FiLock, FiUser } from 'react-icons/fi';
import { getDefaultPostLoginPath, isEmployeeUser } from '../../utils/roleAccess';
import './Auth.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, login, logout } = useAuth();

    if (user) {
        return <Navigate to={getDefaultPostLoginPath(user)} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await login(username, password);
            const loggedInUser = data?.user;

            if (isEmployeeUser(loggedInUser)) {
                logout();
                toast.error('Employee account detected. Please use Employee Login.');
                return;
            }

            toast.success('Welcome back!');
            window.location.replace(getDefaultPostLoginPath(loggedInUser));
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

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Welcome Back</h1>
                    <p>Sign in to your Paras Traders account</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <FiUser className="input-icon" />
                        <input
                            type="text" placeholder="Username or Email"
                            value={username} onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <FiLock className="input-icon" />
                        <input
                            type="password" placeholder="Password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-auth" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
            </div>
        </div>
    );
}
