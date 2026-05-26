import { FiMinus, FiPlus } from 'react-icons/fi';

export default function QuantityControl({ quantity, onDecrease, onIncrease }) {
    return (
        <div className="quantity-control">
            <button onClick={onDecrease}><FiMinus /></button>
            <span>{quantity}</span>
            <button onClick={onIncrease}><FiPlus /></button>
        </div>
    );
}
