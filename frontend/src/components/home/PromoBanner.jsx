import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

export default function PromoBanner() {
    return (
        <section className="promo-banner">
            <div className="promo-content">
                <span className="promo-badge">Limited Offer</span>
                <h2>Up to 60% Off on Electronics</h2>
                <p>Don't miss out on our biggest sale event. Premium brands at amazing discounts!</p>
                <Link to="/products?category=1" className="btn-primary-lg">
                    Shop Electronics <FiArrowRight />
                </Link>
            </div>
        </section>
    );
}
