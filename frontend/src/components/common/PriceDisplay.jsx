export default function PriceDisplay({ price, originalPrice, className = '' }) {
    const current = Number(price);
    const original = Number(originalPrice);
    const hasDiscount = originalPrice && original > current;

    return (
        <div className={`card-price ${className}`}>
            <span className="price-current">₹{current.toLocaleString('en-IN')}</span>
            {hasDiscount && (
                <span className="price-original">₹{original.toLocaleString('en-IN')}</span>
            )}
        </div>
    );
}
