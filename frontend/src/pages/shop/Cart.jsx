import { FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import CartItem from '../../components/cart/CartItem';
import CartSummary from '../../components/cart/CartSummary';
import EmptyCart from '../../components/cart/EmptyCart';
import './Cart.css';

export default function Cart() {
    const { cartItems, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();
    const { user } = useAuth();

    const handleRemove = async (item) => {
        try {
            await removeFromCart(user ? item.id : item.product?.id);
            toast.success('Item removed');
        } catch {
            toast.error('Failed');
        }
    };

    const handleQuantity = async (item, newQty) => {
        try {
            await updateQuantity(user ? item.id : item.product?.id, newQty);
        } catch {
            toast.error('Failed to update');
        }
    };

    if (cartItems.length === 0) return <EmptyCart />;

    return (
        <div className="cart-page">
            <h1>Shopping Cart <span>({cartItems.length} items)</span></h1>

            <div className="cart-layout">
                <div className="cart-items">
                    {cartItems.map((item) => (
                        <CartItem
                            key={item.id || item.product?.id}
                            item={item}
                            onRemove={handleRemove}
                            onUpdateQuantity={handleQuantity}
                        />
                    ))}
                    <button className="clear-cart" onClick={clearCart}>
                        <FiTrash2 /> Clear Cart
                    </button>
                </div>

                <CartSummary cartItems={cartItems} cartTotal={cartTotal} user={user} />
            </div>
        </div>
    );
}
