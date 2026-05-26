import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

export default function StarRating({ rating, size = 14, interactive = false, onRate }) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars.push(
                <FaStar
                    key={i}
                    style={{ color: '#fbbf24', fontSize: size, cursor: interactive ? 'pointer' : 'default' }}
                    onClick={() => interactive && onRate && onRate(i)}
                />
            );
        } else if (i === fullStars + 1 && hasHalf) {
            stars.push(
                <FaStarHalfAlt
                    key={i}
                    style={{ color: '#fbbf24', fontSize: size, cursor: interactive ? 'pointer' : 'default' }}
                    onClick={() => interactive && onRate && onRate(i)}
                />
            );
        } else {
            stars.push(
                <FaRegStar
                    key={i}
                    style={{ color: '#fbbf24', fontSize: size, cursor: interactive ? 'pointer' : 'default' }}
                    onClick={() => interactive && onRate && onRate(i)}
                />
            );
        }
    }

    return <span style={{ display: 'inline-flex', gap: 2 }}>{stars}</span>;
}
