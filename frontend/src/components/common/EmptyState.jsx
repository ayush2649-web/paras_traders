import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

export default function EmptyState({ icon: Icon, title, message, linkTo, linkText }) {
    return (
        <div className="empty-cart">
            {Icon && <Icon className="empty-icon" />}
            <h2>{title}</h2>
            {message && <p>{message}</p>}
            {linkTo && (
                <Link to={linkTo} className="btn-primary-lg">
                    {linkText} <FiArrowRight />
                </Link>
            )}
        </div>
    );
}
