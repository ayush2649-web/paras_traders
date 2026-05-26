import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth';
import './Footer.css';

export default function Footer() {
    const { user } = useAuth();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-grid">
                    <div className="footer-col brand-col">
                        <h3><span className="brand-icon">🛒</span> Paras Traders</h3>
                        <p>Your one-stop destination for quality products at unbeatable prices. Shop electronics, fashion, home essentials and more.</p>
                        <div className="social-links">
                            <a href="#"><FaFacebook /></a>
                            <a href="#"><FaTwitter /></a>
                            <a href="#"><FaInstagram /></a>
                            <a href="#"><FaLinkedin /></a>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h4>Quick Links</h4>
                        <Link to="/">Home</Link>
                        <Link to="/products">All Products</Link>
                        <Link to="/products?category=1">Electronics</Link>
                        <Link to="/products?category=2">Fashion</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Customer Service</h4>
                        <Link to={user ? '/profile' : '/login'}>My Account</Link>
                        <Link to="/cart">Shopping Cart</Link>
                        {user && <Link to="/wishlist">Wishlist</Link>}
                        {user && <Link to="/track-order">Order Tracking</Link>}
                    </div>

                    <div className="footer-col">
                        <h4>Partner With Us</h4>
                        <Link to="/jobs">Jobs</Link>
                        <Link to="/sell">Merchant Partner</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Contact Us</h4>
                        <p className="contact-item"><FiMapPin /> 123 Market Street, Delhi, India</p>
                        <p className="contact-item"><FiPhone /> +91 98765 43210</p>
                        <p className="contact-item"><FiMail /> support@parastraders.com</p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} Paras Traders. All rights reserved.</p>
                    <div className="footer-bottom-links">
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                        <a href="#">Shipping Info</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
