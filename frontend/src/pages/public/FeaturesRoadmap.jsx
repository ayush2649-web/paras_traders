import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCpu, FiFilter, FiSearch, FiZap } from 'react-icons/fi';
import { featureRoadmap, nextLevelIdeas, roadmapStatusMeta } from '../../data/featureRoadmap';
import './FeaturesRoadmap.css';

const FILTERS = [
    { id: 'all', label: 'All Features' },
    { id: 'implemented', label: 'Implemented' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'planned', label: 'Planned' },
];

function statusInfo(status) {
    return roadmapStatusMeta[status] || roadmapStatusMeta.planned;
}

export default function FeaturesRoadmap() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [query, setQuery] = useState('');

    const cards = useMemo(() => {
        const search = query.trim().toLowerCase();
        return featureRoadmap.filter((feature) => {
            if (activeFilter !== 'all' && feature.status !== activeFilter) return false;
            if (!search) return true;
            const inTitle = feature.title.toLowerCase().includes(search);
            const inItems = feature.items.some((item) => item.toLowerCase().includes(search));
            return inTitle || inItems;
        });
    }, [activeFilter, query]);

    const summary = useMemo(() => {
        const totals = { total: featureRoadmap.length, implemented: 0, in_progress: 0, planned: 0 };
        featureRoadmap.forEach((item) => {
            if (item.status === 'implemented') totals.implemented += 1;
            if (item.status === 'in_progress') totals.in_progress += 1;
            if (item.status === 'planned') totals.planned += 1;
        });
        return totals;
    }, []);

    return (
        <div className="roadmap-page">
            <section className="roadmap-hero">
                <div className="roadmap-hero-content">
                    <span className="roadmap-chip"><FiCpu /> Product Vision</span>
                    <h1>Innovation Roadmap</h1>
                    <p>
                        Website updated from <code>features.txt</code>. Track what is live, what is being built,
                        and what is planned next.
                    </p>
                    <div className="roadmap-hero-actions">
                        <Link to="/products" className="btn-primary-lg">Shop Now <FiArrowRight /></Link>
                        <Link to="/rewards" className="btn-outline-lg">Try Live Features</Link>
                    </div>
                </div>
                <div className="roadmap-stats">
                    <div><strong>{summary.total}</strong><span>Total Ideas</span></div>
                    <div><strong>{summary.implemented}</strong><span>Implemented</span></div>
                    <div><strong>{summary.in_progress}</strong><span>In Progress</span></div>
                    <div><strong>{summary.planned}</strong><span>Planned</span></div>
                </div>
            </section>

            <section className="roadmap-controls">
                <div className="roadmap-filter">
                    <FiFilter />
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            className={activeFilter === filter.id ? 'active' : ''}
                            onClick={() => setActiveFilter(filter.id)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
                <div className="roadmap-search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search by feature or capability..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </section>

            <section className="roadmap-grid">
                {cards.length === 0 ? (
                    <div className="roadmap-empty">
                        <h3>No features match your filters</h3>
                        <p>Try clearing search or switching the status filter.</p>
                    </div>
                ) : (
                    cards.map((feature) => {
                        const meta = statusInfo(feature.status);
                        return (
                            <article key={feature.title} className="roadmap-card">
                                <div className="roadmap-card-head">
                                    <h3>{feature.title}</h3>
                                    <span style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
                                </div>
                                <ul>
                                    {feature.items.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </article>
                        );
                    })
                )}
            </section>

            <section className="next-level-section">
                <h2><FiZap /> Next-Level Concepts</h2>
                <div className="next-level-list">
                    {nextLevelIdeas.map((idea) => (
                        <span key={idea}>{idea}</span>
                    ))}
                </div>
            </section>
        </div>
    );
}
