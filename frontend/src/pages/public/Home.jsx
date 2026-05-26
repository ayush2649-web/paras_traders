import { useEffect } from 'react';
import { FiStar } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import useProducts from '../../hooks/useProducts';
import Loader from '../../components/common/Loader';
import HeroBanner from '../../components/home/HeroBanner';
import FeatureStrip from '../../components/home/FeatureStrip';
import CategoryGrid from '../../components/home/CategoryGrid';
import ProductSection from '../../components/home/ProductSection';
import PromoBanner from '../../components/home/PromoBanner';
import InnovationSpotlight from '../../components/home/InnovationSpotlight';
import CTASection from '../../components/home/CTASection';
import './Home.css';

export default function Home() {
    const { user } = useAuth();
    const { addToCart } = useCart();
    const {
        categories, featured, topRated,
        loading, loadFeatured, loadTopRated, loadCategories,
    } = useProducts();

    useEffect(() => {
        loadCategories();
        loadFeatured();
        loadTopRated();
    }, [loadCategories, loadFeatured, loadTopRated]);

    const handleAddToCart = async (product) => {
        try {
            await addToCart(product);
            toast.success(`${product.name} added to cart!`);
        } catch {
            toast.error('Failed to add to cart');
        }
    };

    if (loading) return <Loader message="Loading amazing deals..." />;

    return (
        <div className="home-page">
            <HeroBanner />
            <FeatureStrip />
            <CategoryGrid categories={categories} />

            <ProductSection
                title="Featured Products"
                icon={<FiStar />}
                products={featured}
                linkTo="/products?featured=true"
                onAddToCart={handleAddToCart}
            />

            <PromoBanner />

            <ProductSection
                title="Top Rated Products"
                icon="⭐"
                products={topRated}
                linkTo="/products"
                onAddToCart={handleAddToCart}
            />

            <InnovationSpotlight />

            {!user && <CTASection />}
        </div>
    );
}
