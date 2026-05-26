import ProductCard from '../common/ProductCard';
import SectionHeader from '../common/SectionHeader';

export default function ProductSection({ title, icon, products, linkTo, onAddToCart }) {
    if (!products.length) return null;

    return (
        <section className="section">
            <SectionHeader title={title} icon={icon} linkTo={linkTo} />
            <div className="products-grid">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={onAddToCart}
                    />
                ))}
            </div>
        </section>
    );
}
