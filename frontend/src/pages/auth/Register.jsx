import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';
import './Auth.css';

export default function Register() {
    const [form, setForm] = useState({
        username: '', email: '', password: '', password2: '',
        first_name: '', last_name: '', gender: ''
    });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.password2) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await register(form);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (err) {
            const errors = err.response?.data || err;
            if (errors) {
                Object.values(errors).flat().forEach((msg) => toast.error(msg));
            } else {
                toast.error('Registration failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Join Paras Traders and start shopping</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-row">
                        <div className="input-group">
                            <FiUser className="input-icon" />
                            <input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <FiUser className="input-icon" />
                            <input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="input-group">
                        <FiUser className="input-icon" />
                        <select name="gender" value={form.gender} onChange={handleChange} required>
                            <option value="" disabled>Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <FiUser className="input-icon" />
                        <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <FiMail className="input-icon" />
                        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <FiLock className="input-icon" />
                        <input name="password" type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={handleChange} required minLength={6} />
                    </div>
                    <div className="input-group">
                        <FiLock className="input-icon" />
                        <input name="password2" type="password" placeholder="Confirm Password" value={form.password2} onChange={handleChange} required minLength={6} />
                    </div>
                    <button type="submit" className="btn-auth" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign In</Link>
                </p>
            </div>
        </div>
    );
}
