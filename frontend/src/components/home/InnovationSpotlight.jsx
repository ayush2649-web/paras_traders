import { Link } from 'react-router-dom';
import { FiCpu, FiArrowRight } from 'react-icons/fi';

const INNOVATION_ITEMS = [
    {
        title: 'Live Now',
        desc: 'Smart delivery slots, green delivery, rewards, daily login points, and scratch cards are active.',
    },
    {
        title: 'In Build Queue',
        desc: 'Community reviews, product comparison, social proof feed, and subscription-driven reorder workflows.',
    },
    {
        title: 'Next-Gen Vision',
        desc: 'AR try-on, AI assistants, live shopping, and personalized pricing intelligence.',
    },
];

export default function InnovationSpotlight() {
    return (
        <section className="section innovation-spotlight">
            <div className="section-header">
                <h2><FiCpu /> Innovation Roadmap</h2>
                <Link to="/innovation" className="view-all">Explore All Ideas <FiArrowRight /></Link>
            </div>
            <div className="innovation-grid">
                {INNOVATION_ITEMS.map(({ title, desc }) => (
                    <article key={title}>
                        <h3>{title}</h3>
                        <p>{desc}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
