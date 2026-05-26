import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FiBriefcase, FiCheckCircle, FiMapPin, FiSend } from 'react-icons/fi';
import API from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import './Jobs.css';

const DEFAULT_ROLES = [
    { value: 'merchant_partner', label: 'Merchant Partner', description: 'List and sell your products on the Paras Traders platform. Manage your own inventory, pricing, and listings.' },
    { value: 'delivery_partner', label: 'Delivery Partner', description: 'Handle deliveries and ensure last-mile order success.' },
    { value: 'warehouse_associate', label: 'Warehouse Associate', description: 'Manage packing, inventory updates, and dispatch operations.' },
    { value: 'customer_support', label: 'Customer Support Executive', description: 'Assist customers with orders, returns, and issue resolution.' },
    { value: 'sales_executive', label: 'Sales Executive', description: 'Drive customer acquisition and improve conversion outcomes.' },
    { value: 'frontend_developer', label: 'Frontend Developer', description: 'Build and optimize modern user interfaces.' },
    { value: 'backend_developer', label: 'Backend Developer', description: 'Develop robust APIs and backend workflows.' },
    { value: 'uiux_designer', label: 'UI/UX Designer', description: 'Design product journeys and visual systems.' },
    { value: 'qa_engineer', label: 'QA Engineer', description: 'Improve release quality through structured test coverage.' },
    { value: 'digital_marketing', label: 'Digital Marketing Specialist', description: 'Run growth campaigns and marketing analytics.' },
    { value: 'operations_manager', label: 'Operations Manager', description: 'Coordinate teams and optimize business operations.' },
];


const INITIAL_FORM = {
    full_name: '',
    email: '',
    phone: '',
    city: '',
    role_applied: '',
    experience_years: '0',
    resume_url: '',
    portfolio_url: '',
    message: '',
};

export default function Jobs() {
    const { user } = useAuth();
    const [roles, setRoles] = useState(DEFAULT_ROLES);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);

    useEffect(() => {
        const defaultRole = DEFAULT_ROLES[0]?.value || '';
        setForm((prev) => ({
            ...prev,
            full_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : prev.full_name,
            email: user?.email || prev.email,
            role_applied: prev.role_applied || defaultRole,
        }));
    }, [user]);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                setLoadingRoles(true);
                const res = await API.get('jobs/roles/');
                const apiRoles = res.data?.roles;
                if (Array.isArray(apiRoles) && apiRoles.length > 0) {
                    setRoles(apiRoles);
                    setForm((prev) => ({
                        ...prev,
                        role_applied: prev.role_applied || apiRoles[0].value,
                    }));
                }
            } catch (err) {
                console.error(err);
                toast.error('Unable to load roles. Showing default options.');
            } finally {
                setLoadingRoles(false);
            }
        };

        fetchRoles();
    }, []);

    const selectedRoleLabel = useMemo(() => {
        const selected = roles.find((role) => role.value === form.role_applied);
        return selected?.label || 'Selected Role';
    }, [roles, form.role_applied]);

    const selectRole = (roleValue) => {
        setForm((prev) => ({ ...prev, role_applied: roleValue }));
        const formElement = document.getElementById('job-application-form');
        if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const payload = {
                ...form,
                experience_years: Number(form.experience_years || 0),
            };
            const res = await API.post('jobs/apply/', payload);
            toast.success(res.data?.message || 'Application submitted successfully');
            setForm((prev) => ({
                ...INITIAL_FORM,
                full_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
                email: user?.email || '',
                role_applied: prev.role_applied || roles[0]?.value || '',
            }));
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="jobs-page">
            <section className="jobs-hero">
                <div className="jobs-hero-content">
                    <span className="jobs-chip"><FiBriefcase /> Careers at Paras Traders</span>
                    <h1>Join Our Team</h1>
                    <p>
                        Apply for roles across operations, delivery, technology, and support.
                        We are building a fast, customer-focused commerce platform.
                    </p>
                    <div className="jobs-highlights">
                        <span><FiCheckCircle /> Growth opportunities</span>
                        <span><FiCheckCircle /> Hybrid role options</span>
                        <span><FiMapPin /> Multiple city openings</span>
                    </div>
                </div>
            </section>

            <section className="jobs-section">
                <div className="section-head">
                    <h2>Open Roles</h2>
                    <p>Choose a role and apply below.</p>
                </div>
                {loadingRoles ? (
                    <div className="page-loader"><div className="spinner"></div></div>
                ) : (
                    <div className="jobs-role-grid">
                        {roles.map((role) => (
                            <article key={role.value} className={`jobs-role-card ${form.role_applied === role.value ? 'active' : ''}`}>
                                <h3>{role.label}</h3>
                                <p>{role.description || 'Role details shared during screening.'}</p>
                                <button type="button" onClick={() => selectRole(role.value)}>
                                    Apply for this role
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="jobs-section form-section" id="job-application-form">
                <div className="section-head">
                    <h2>Application Form</h2>
                    <p>Applying for: <strong>{selectedRoleLabel}</strong></p>
                </div>

                <form className="jobs-form" onSubmit={onSubmit}>
                    <div className="jobs-form-grid">
                        <div>
                            <label>Full Name</label>
                            <input
                                name="full_name"
                                value={form.full_name}
                                onChange={onChange}
                                required
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div>
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={onChange}
                                required
                                placeholder="Enter your email"
                            />
                        </div>
                        <div>
                            <label>Phone</label>
                            <input
                                name="phone"
                                value={form.phone}
                                onChange={onChange}
                                required
                                placeholder="Enter your phone number"
                            />
                        </div>
                        <div>
                            <label>City</label>
                            <input
                                name="city"
                                value={form.city}
                                onChange={onChange}
                                placeholder="Your city"
                            />
                        </div>
                        <div>
                            <label>Role</label>
                            <select name="role_applied" value={form.role_applied} onChange={onChange} required>
                                {roles.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>Experience (Years)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                max="50"
                                name="experience_years"
                                value={form.experience_years}
                                onChange={onChange}
                            />
                        </div>
                        <div>
                            <label>Resume URL</label>
                            <input
                                type="url"
                                name="resume_url"
                                value={form.resume_url}
                                onChange={onChange}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label>Portfolio URL (Optional)</label>
                            <input
                                type="url"
                                name="portfolio_url"
                                value={form.portfolio_url}
                                onChange={onChange}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div>
                        <label>Why should we hire you?</label>
                        <textarea
                            name="message"
                            value={form.message}
                            onChange={onChange}
                            rows="5"
                            placeholder="Briefly describe your skills and relevant experience..."
                        />
                    </div>

                    <button type="submit" className="jobs-submit-btn" disabled={submitting}>
                        <FiSend /> {submitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                </form>
            </section>
        </div>
    );
}
