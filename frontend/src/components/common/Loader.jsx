import './Loader.css';

export default function Loader({ message = 'Loading...' }) {
    return (
        <div className="page-loader">
            <div className="spinner"></div>
            <p>{message}</p>
        </div>
    );
}
