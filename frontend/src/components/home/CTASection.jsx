import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

export default function CTASection() {
    return (
        <section className="cta-section">
            <h2>Ready to Start Shopping?</h2>
            <p>Create your free account and get exclusive deals and early access to sales.</p>
            <Link to="/register" className="btn-primary-lg">
                Create Free Account <FiArrowRight />
            </Link>
        </section>
    );
}
