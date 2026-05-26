import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

export default function SectionHeader({ title, icon, linkTo, linkText = 'View All' }) {
    return (
        <div className="section-header">
            <h2>{icon} {title}</h2>
            {linkTo && (
                <Link to={linkTo} className="view-all">
                    {linkText} <FiArrowRight />
                </Link>
            )}
        </div>
    );
}
