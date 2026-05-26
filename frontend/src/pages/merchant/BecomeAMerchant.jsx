import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiPackage,
  FiSend,
  FiShield,
  FiShoppingBag,
  FiTrendingUp,
} from "react-icons/fi";
import { toast } from "react-toastify";
import API, { extractApiError } from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import "./BecomeAMerchant.css";

const BENEFITS = [
  {
    icon: <FiShoppingBag />,
    title: "List Your Products",
    desc: "Easily add and manage your products with full control over pricing, stock, and descriptions.",
  },
  {
    icon: <FiBarChart2 />,
    title: "Real-Time Analytics",
    desc: "Track your revenue, units sold, top products, and monthly trends from your merchant dashboard.",
  },
  {
    icon: <FiTrendingUp />,
    title: "Grow Your Sales",
    desc: "Reach thousands of customers on the Paras Traders platform with plans built for different catalogue sizes.",
  },
  {
    icon: <FiPackage />,
    title: "Inventory Management",
    desc: "Manage stock levels, set discounts, toggle active status, and keep your listings fresh.",
  },
  {
    icon: <FiShield />,
    title: "Admin-Verified Access",
    desc: "All merchant accounts are reviewed and approved by our team, ensuring a trusted marketplace.",
  },
  {
    icon: <FiCheckCircle />,
    title: "Simple Onboarding",
    desc: "Choose a plan, submit your application, and start selling as soon as your account is approved.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Choose Your Plan",
    desc: "Pick the subscription that fits your catalogue size and merchant support needs.",
  },
  {
    num: "02",
    title: "Submit Application",
    desc: "Fill out the merchant partner application form with your business information.",
  },
  {
    num: "03",
    title: "Get Approved",
    desc: "After review, your merchant account is activated with the selected subscription.",
  },
];

const INITIAL_FORM = {
  full_name: "",
  email: "",
  phone: "",
  city: "",
  business_name: "",
  role_applied: "merchant_partner",
  selected_subscription_plan: "",
  selected_billing_cycle: "monthly",
  experience_years: "0",
  resume_url: "",
  portfolio_url: "",
  message: "",
};

function formatCurrency(value) {
  const numericValue = Number(value || 0);
  return `₹${numericValue.toLocaleString("en-IN")}`;
}

function getPlanFeatures(plan) {
  if (!plan) return [];
  const features = [
    plan.product_limit_label,
    `${plan.commission_rate}% platform commission`,
    plan.advanced_analytics ? "Advanced merchant analytics" : "Basic analytics",
  ];
  if (plan.priority_support) features.push("Priority merchant support");
  if (plan.featured_placement)
    features.push("Featured placement in the marketplace");
  return features;
}

export default function BecomeAMerchant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      full_name: user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
        : prev.full_name,
      email: user?.email || prev.email,
    }));
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadPlans = async () => {
      try {
        setPlansLoading(true);
        const res = await API.get("merchant/subscription/plans/");
        if (!isMounted) return;
        const results = Array.isArray(res.data?.results) ? res.data.results : [];
        setPlans(results);
        setForm((prev) => {
          if (prev.selected_subscription_plan) return prev;
          const defaultPlan = results.find((plan) => plan.is_recommended) || results[0];
          return {
            ...prev,
            selected_subscription_plan: defaultPlan ? String(defaultPlan.id) : "",
          };
        });
      } catch (err) {
        toast.error(extractApiError(err, "Failed to load subscription plans"));
      } finally {
        if (isMounted) setPlansLoading(false);
      }
    };

    loadPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPlan = useMemo(
    () =>
      plans.find(
        (plan) => String(plan.id) === String(form.selected_subscription_plan),
      ) || null,
    [plans, form.selected_subscription_plan],
  );

  const currentPlanPrice = selectedPlan
    ? form.selected_billing_cycle === "yearly"
      ? selectedPlan.yearly_price
      : selectedPlan.monthly_price
    : 0;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please log in to submit your application.");
      navigate("/login");
      return;
    }
    if (!form.selected_subscription_plan) {
      toast.error("Please choose a subscription plan.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        selected_subscription_plan: Number(form.selected_subscription_plan),
        experience_years: Number(form.experience_years || 0),
      };
      const res = await API.post("jobs/apply/", payload);
      toast.success(
        res.data?.message ||
          "Application submitted! We will review and get back to you soon.",
      );
      setSubmitted(true);
    } catch (err) {
      toast.error(
        extractApiError(err, "Failed to submit application. Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bam-page">
      <section className="bam-hero">
        <div className="bam-hero-bg" />
        <div className="bam-hero-content">
          <span className="bam-hero-chip">
            <FiShoppingBag /> Merchant Partner Program
          </span>
          <h1>
            Sell on <span className="bam-gradient-text">Paras Traders</span>
          </h1>
          <p>
            Launch your store on Paras Traders with a merchant subscription built
            around your catalogue size, support needs, and sales goals.
          </p>
          <a href="#bam-plans" className="bam-cta-btn">
            Choose a Plan <FiArrowRight />
          </a>
        </div>
      </section>

      <section className="bam-section">
        <div className="bam-section-label">Why partner with us?</div>
        <h2 className="bam-section-heading">Everything you need to grow</h2>
        <div className="bam-benefits-grid">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="bam-benefit-card">
              <div className="bam-benefit-icon">{benefit.icon}</div>
              <h3>{benefit.title}</h3>
              <p>{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bam-section bam-section-alt">
        <div className="bam-section-label">Process</div>
        <h2 className="bam-section-heading">How it works</h2>
        <div className="bam-steps-row">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="bam-step">
              <div className="bam-step-num">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              {idx < STEPS.length - 1 && <div className="bam-step-connector" />}
            </div>
          ))}
        </div>
      </section>

      <section className="bam-section" id="bam-plans">
        <div className="bam-section-label">Pricing</div>
        <h2 className="bam-section-heading">Choose a merchant subscription</h2>
        <div className="bam-billing-toggle">
          <button
            type="button"
            className={
              form.selected_billing_cycle === "monthly"
                ? "bam-billing-btn active"
                : "bam-billing-btn"
            }
            onClick={() =>
              setForm((prev) => ({ ...prev, selected_billing_cycle: "monthly" }))
            }
          >
            Monthly
          </button>
          <button
            type="button"
            className={
              form.selected_billing_cycle === "yearly"
                ? "bam-billing-btn active"
                : "bam-billing-btn"
            }
            onClick={() =>
              setForm((prev) => ({ ...prev, selected_billing_cycle: "yearly" }))
            }
          >
            Yearly
          </button>
        </div>

        {plansLoading ? (
          <div className="bam-plan-loading">Loading merchant plans...</div>
        ) : (
          <div className="bam-plan-grid">
            {plans.map((plan) => {
              const isSelected =
                String(plan.id) === String(form.selected_subscription_plan);
              const displayPrice =
                form.selected_billing_cycle === "yearly"
                  ? plan.yearly_price
                  : plan.monthly_price;

              return (
                <button
                  key={plan.id}
                  type="button"
                  className={isSelected ? "bam-plan-card selected" : "bam-plan-card"}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      selected_subscription_plan: String(plan.id),
                    }))
                  }
                >
                  {plan.is_recommended && (
                    <span className="bam-plan-badge">Most Popular</span>
                  )}
                  <div className="bam-plan-head">
                    <h3>{plan.name}</h3>
                    <p>{plan.short_description}</p>
                  </div>
                  <div className="bam-plan-price">
                    <strong>{formatCurrency(displayPrice)}</strong>
                    <span>
                      / {form.selected_billing_cycle === "yearly" ? "year" : "month"}
                    </span>
                  </div>
                  {form.selected_billing_cycle === "yearly" &&
                    Number(plan.estimated_yearly_savings || 0) > 0 && (
                      <div className="bam-plan-saving">
                        Save {formatCurrency(plan.estimated_yearly_savings)} yearly
                      </div>
                    )}
                  <ul className="bam-plan-features">
                    {getPlanFeatures(plan).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="bam-section" id="bam-form">
        <div className="bam-section-label">Get started</div>
        <h2 className="bam-section-heading">Merchant Partner Application</h2>

        {submitted ? (
          <div className="bam-success-card">
            <div className="bam-success-icon">
              <FiCheckCircle />
            </div>
            <h3>Application Submitted!</h3>
            <p>
              Thank you for applying. We received your request for the{" "}
              <strong>{selectedPlan?.name || "merchant"}</strong> plan with{" "}
              <strong>{form.selected_billing_cycle}</strong> billing. Once your
              business is approved, this subscription will be activated for your
              merchant account.
            </p>
            <Link
              to="/"
              className="bam-cta-btn"
              style={{ display: "inline-flex", marginTop: "1rem" }}
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <form className="bam-form" onSubmit={onSubmit}>
            <div className="bam-plan-summary">
              <div>
                <span className="bam-plan-summary-label">Selected subscription</span>
                <strong>{selectedPlan?.name || "Choose a plan above"}</strong>
              </div>
              <div className="bam-plan-summary-price">
                <strong>{formatCurrency(currentPlanPrice)}</strong>
                <span>
                  / {form.selected_billing_cycle === "yearly" ? "year" : "month"}
                </span>
              </div>
            </div>

            <div className="bam-form-grid">
              <div className="bam-field">
                <label>Full Name *</label>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={onChange}
                  required
                  placeholder="Your full name"
                />
              </div>
              <div className="bam-field">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  required
                  placeholder="your@email.com"
                />
              </div>
              <div className="bam-field">
                <label>Phone *</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  required
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div className="bam-field">
                <label>City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  placeholder="Your city"
                />
              </div>
              <div className="bam-field">
                <label>Business Name *</label>
                <input
                  name="business_name"
                  value={form.business_name}
                  onChange={onChange}
                  required
                  placeholder="Your business name"
                />
              </div>
              <div className="bam-field">
                <label>Business Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  name="experience_years"
                  value={form.experience_years}
                  onChange={onChange}
                />
              </div>
              <div className="bam-field">
                <label>Website / Portfolio URL</label>
                <input
                  type="url"
                  name="portfolio_url"
                  value={form.portfolio_url}
                  onChange={onChange}
                  placeholder="https://your-business.com"
                />
              </div>
              <div className="bam-field bam-field-full">
                <label>Why do you want to sell on Paras Traders? *</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  required
                  rows="5"
                  placeholder="Tell us about your products, business, and why you'd like to be a merchant partner..."
                />
              </div>
            </div>
            {!user && (
              <div className="bam-login-notice">
                <FiShield /> You need to be logged in to submit.{" "}
                <Link to="/login">Log in here</Link>
              </div>
            )}
            <button
              type="submit"
              className="bam-submit-btn"
              disabled={submitting || !user || plansLoading || !selectedPlan}
            >
              <FiSend /> {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
