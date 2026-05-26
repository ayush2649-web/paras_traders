import { FiTruck, FiShield, FiRefreshCw, FiHeadphones } from "react-icons/fi";

const FEATURES = [
  { icon: FiTruck, title: "Free Shipping", desc: "On orders above ₹999" },
  { icon: FiShield, title: "Secure Payments", desc: "100% protected" },
  { icon: FiRefreshCw, title: "Easy Returns", desc: "7-day return policy" },
  { icon: FiHeadphones, title: "24/7 Support", desc: "We're here to help" },
];

export default function FeatureStrip() {
  return (
    <section className="features-strip">
      {FEATURES.map((feature) => (
        <div className="feature-item" key={feature.title}>
          <feature.icon className="feature-icon" />
          <div>
            <strong>{feature.title}</strong>
            <span>{feature.desc}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
