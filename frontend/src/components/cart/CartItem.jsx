import { Link } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { getMediaUrl } from '../../api/config';
import QuantityControl from './QuantityControl';

export default function CartItem({ item, onRemove, onUpdateQuantity }) {
    const product = item.product;
    const imgUrl = product?.image
        ? getMediaUrl(product.image)
        : 'https://via.placeholder.com/120x120?text=No+Image';

    return (
        <div className="cart-item">
            <img src={imgUrl} alt={product?.name} className="cart-item-img" />
            <div className="cart-item-info">
                <Link to={`/products/${product?.id}`} className="cart-item-name">
                    {product?.name}
                </Link>
                <p className="cart-item-brand">{product?.brand}</p>
                <p className="cart-item-price">₹{Number(product?.price).toLocaleString('en-IN')}</p>
            </div>
            <div className="cart-item-actions">
                <QuantityControl
                    quantity={item.quantity}
                    onDecrease={() => onUpdateQuantity(item, item.quantity - 1)}
                    onIncrease={() => onUpdateQuantity(item, item.quantity + 1)}
                />
                <p className="cart-item-total">
                    ₹{(Number(product?.price) * item.quantity).toLocaleString('en-IN')}
                </p>
                <button className="remove-btn" onClick={() => onRemove(item)}>
                    <FiTrash2 />
                </button>
            </div>
        </div>
    );
}
