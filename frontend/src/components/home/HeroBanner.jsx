import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

export default function HeroBanner() {
    return (
        <section className="hero">
            <div className="hero-bg-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>
            <div className="hero-content">
                <span className="hero-badge">🔥 Big Sale Live Now</span>
                <h1>Discover Premium <br /><span className="gradient-text">Products You Love</span></h1>
                <p>Shop the latest electronics, fashion, home essentials &amp; more at unbeatable prices. Free shipping on orders above ₹999!</p>
                <div className="hero-actions">
                    <Link to="/products" className="btn-primary-lg">
                        Shop Now <FiArrowRight />
                    </Link>
                    <Link to="/products?featured=true" className="btn-outline-lg">
                        View Deals
                    </Link>
                </div>
                <div className="hero-stats">
                    <div><strong>10K+</strong><span>Products</span></div>
                    <div><strong>5K+</strong><span>Happy Customers</span></div>
                    <div><strong>100%</strong><span>Secure</span></div>
                </div>
            </div>
        </section>
    );
}
