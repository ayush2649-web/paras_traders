import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';

export default function SearchBar({ onSearch }) {
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery('');
        onSearch?.();
    };

    return (
        <form className="navbar-search" onSubmit={handleSubmit}>
            <FiSearch className="search-icon" />
            <input
                type="text"
                placeholder="Search products, brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">Search</button>
        </form>
    );
}
