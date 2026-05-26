import { FiShoppingBag } from 'react-icons/fi';
import EmptyState from '../common/EmptyState';

export default function EmptyCart() {
    return (
        <EmptyState
            icon={FiShoppingBag}
            title="Your cart is empty"
            message="Looks like you haven't added anything to your cart yet."
            linkTo="/products"
            linkText="Start Shopping"
        />
    );
}
