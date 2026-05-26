import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

export default function CartSummary({ cartItems, cartTotal, user }) {
    const shippingCost = cartTotal >= 999 ? 0 : 99;
    const finalTotal = cartTotal + shippingCost;

    return (
        <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-row">
                <span>Shipping</span>
                <span className="free">{shippingCost === 0 ? 'FREE' : '₹99'}</span>
            </div>
            <div className="summary-row total">
                <span>Total</span>
                <span>₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>
            {cartTotal < 999 && (
                <p className="free-ship-msg">
                    Add ₹{(999 - cartTotal).toLocaleString('en-IN')} more for free shipping!
                </p>
            )}
            <Link to={user ? '/checkout' : '/login'} className="btn-checkout">
                {user ? 'Proceed to Checkout' : 'Login to Checkout'} <FiArrowRight />
            </Link>
            <Link to="/products" className="continue-shopping">
                ← Continue Shopping
            </Link>
        </div>
    );
}
