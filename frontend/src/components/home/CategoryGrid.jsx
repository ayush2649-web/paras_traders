import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';

const CATEGORY_EMOJIS = {
    'Electronics': '📱',
    'Fashion': '👕',
    'Home & Kitchen': '🏠',
    'Books': '📚',
    'Sports & Fitness': '🏋️',
    'Beauty & Health': '💄',
};

export default function CategoryGrid({ categories }) {
    if (!categories.length) return null;

    return (
        <section className="section">
            <SectionHeader title="Shop by Category" linkTo="/products" />
            <div className="categories-grid">
                {categories.map((cat) => (
                    <Link to={`/products?category=${cat.id}`} key={cat.id} className="category-card">
                        <div className="category-icon">
                            {CATEGORY_EMOJIS[cat.name] || '🛍️'}
                        </div>
                        <h3>{cat.name}</h3>
                        <p>{cat.product_count} products</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
