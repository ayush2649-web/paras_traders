import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import { toast } from 'react-toastify';
import { FiAward, FiGift, FiCalendar, FiZap } from 'react-icons/fi';
import './Rewards.css';

function levelColor(level) {
    if (level === 'Gold') return '#f5a623';
    if (level === 'Silver') return '#94a3b8';
    return '#cd7f32';
}

const LEVEL_BASE_POINTS = {
    Bronze: 0,
    Silver: 300,
    Gold: 900,
};

export default function Rewards() {
    const [status, setStatus] = useState(null);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claimingDaily, setClaimingDaily] = useState(false);
    const [revealingId, setRevealingId] = useState(null);

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const [statusRes, cardsRes] = await Promise.all([
                API.get('rewards/status/'),
                API.get('rewards/scratch-cards/'),
            ]);
            setStatus(statusRes.data);
            setCards(cardsRes.data || []);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Failed to load rewards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRewards();
    }, []);

    const handleDailyClaim = async () => {
        try {
            setClaimingDaily(true);
            const res = await API.post('rewards/daily-login/');
            toast.success(`+${res.data.claimed_points} points claimed`);
            await fetchRewards();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Daily reward not available');
        } finally {
            setClaimingDaily(false);
        }
    };

    const handleReveal = async (cardId) => {
        try {
            setRevealingId(cardId);
            const res = await API.post(`rewards/scratch-cards/${cardId}/reveal/`);
            toast.success(
                res.data.claimed_points > 0
                    ? `You won ${res.data.claimed_points} points!`
                    : 'No points this time. Try your next scratch card.'
            );
            await fetchRewards();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Unable to reveal card');
        } finally {
            setRevealingId(null);
        }
    };

    const progress = useMemo(() => {
        if (!status) return 0;
        if (status.next_level?.points_to_unlock === 0) return 100;

        const current = status.reward_points || 0;
        const previousThreshold = LEVEL_BASE_POINTS[status.reward_level] ?? 0;
        const nextThreshold = status.next_level?.threshold || previousThreshold;
        const span = Math.max(nextThreshold - previousThreshold, 1);
        const gained = Math.max(current - previousThreshold, 0);
        return Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
    }, [status]);

    if (loading) {
        return <div className="page-loader"><div className="spinner"></div></div>;
    }

    if (!status) return null;

    return (
        <div className="rewards-page">
            <div className="rewards-header">
                <h1><FiAward /> Rewards Hub</h1>
                <p>Earn points daily, unlock tiers, and reveal scratch cards from your orders.</p>
            </div>

            <div className="rewards-overview">
                <div className="reward-card primary">
                    <span>Reward Points</span>
                    <strong>{status.reward_points}</strong>
                </div>
                <div className="reward-card">
                    <span>Current Tier</span>
                    <strong style={{ color: levelColor(status.reward_level) }}>{status.reward_level}</strong>
                </div>
                <div className="reward-card">
                    <span>Daily Streak</span>
                    <strong>{status.daily_login_streak} days</strong>
                </div>
                <div className="reward-card">
                    <span>Pending Scratch Cards</span>
                    <strong>{status.pending_scratch_cards}</strong>
                </div>
            </div>

            <section className="rewards-section">
                <div className="section-head">
                    <h2><FiCalendar /> Daily Login Reward</h2>
                </div>
                <p className="muted">
                    Claim once per day. Your streak increases your daily bonus points.
                </p>
                <button
                    className="claim-btn"
                    onClick={handleDailyClaim}
                    disabled={!status.can_claim_daily_login || claimingDaily}
                >
                    {claimingDaily
                        ? 'Claiming...'
                        : status.can_claim_daily_login
                            ? 'Claim Daily Reward'
                            : 'Already Claimed Today'}
                </button>
            </section>

            <section className="rewards-section">
                <div className="section-head">
                    <h2><FiZap /> Tier Progress</h2>
                </div>
                <div className="tier-progress">
                    <div className="tier-progress-bar">
                        <div className="tier-progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="muted">
                        {status.next_level?.points_to_unlock > 0
                            ? `${status.next_level.points_to_unlock} points to reach ${status.next_level.level}`
                            : 'You are at the highest tier'}
                    </p>
                </div>
            </section>

            <section className="rewards-section">
                <div className="section-head">
                    <h2><FiGift /> Scratch Cards</h2>
                    <Link to="/profile" className="small-link">View Orders</Link>
                </div>
                {cards.length === 0 ? (
                    <div className="empty-rewards">
                        <p>No scratch cards yet. Place an order to unlock one.</p>
                    </div>
                ) : (
                    <div className="scratch-grid">
                        {cards.map((card) => (
                            <article key={card.id} className={`scratch-card ${card.is_revealed ? 'revealed' : ''}`}>
                                <h3>{card.title}</h3>
                                <p>Order #{card.order_id}</p>
                                <p>Order Value: INR {Number(card.order_total).toLocaleString('en-IN')}</p>
                                {card.is_revealed ? (
                                    <div className="reward-result">
                                        <strong>{card.reward_points || 0} Points</strong>
                                        <span>{card.reward_points > 0 ? 'Added to your rewards balance' : 'Better luck next time'}</span>
                                    </div>
                                ) : (
                                    <button
                                        className="reveal-btn"
                                        onClick={() => handleReveal(card.id)}
                                        disabled={revealingId === card.id}
                                    >
                                        {revealingId === card.id ? 'Revealing...' : 'Scratch Now'}
                                    </button>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
