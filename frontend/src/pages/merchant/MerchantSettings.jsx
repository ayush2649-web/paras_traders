import { useEffect, useMemo, useState } from "react";
import API, { extractApiError } from "../../api/axios";
import { toast } from "react-toastify";
import {
  FiClock,
  FiCreditCard,
  FiLayers,
  FiPower,
  FiSave,
  FiSettings,
  FiTrendingUp,
} from "react-icons/fi";
import "./MerchantInventory.css";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getPlanFeatures(plan) {
  if (!plan) return [];
  const features = [
    plan.product_limit_label,
    `${plan.commission_rate}% platform commission`,
    plan.advanced_analytics ? "Advanced analytics included" : "Basic analytics",
  ];
  if (plan.priority_support) features.push("Priority merchant support");
  if (plan.featured_placement) features.push("Featured marketplace placement");
  return features;
}

export default function MerchantSettings() {
  const [settings, setSettings] = useState({
    store_status: false,
    business_hours: "",
    current_subscription: null,
    product_usage: null,
  });
  const [availablePlans, setAvailablePlans] = useState([]);
  const [subscriptionForm, setSubscriptionForm] = useState({
    plan_id: "",
    billing_cycle: "monthly",
    auto_renew: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);

  const selectedPlan = useMemo(
    () =>
      availablePlans.find(
        (plan) => String(plan.id) === String(subscriptionForm.plan_id),
      ) || null,
    [availablePlans, subscriptionForm.plan_id],
  );

  useEffect(() => {
    const loadMerchantSettings = async () => {
      try {
        setLoading(true);
        const [settingsRes, subscriptionRes] = await Promise.all([
          API.get("merchant/settings/"),
          API.get("merchant/subscription/"),
        ]);

        const currentSubscription = subscriptionRes.data?.current_subscription
          || settingsRes.data?.current_subscription
          || null;
        const productUsage = subscriptionRes.data?.product_usage
          || settingsRes.data?.product_usage
          || null;
        const plans = Array.isArray(subscriptionRes.data?.available_plans)
          ? subscriptionRes.data.available_plans
          : [];

        setSettings({
          store_status: Boolean(settingsRes.data?.store_status),
          business_hours: settingsRes.data?.business_hours || "",
          current_subscription: currentSubscription,
          product_usage: productUsage,
        });
        setAvailablePlans(plans);
        setSubscriptionForm((prev) => ({
          plan_id:
            String(currentSubscription?.plan?.id || "")
            || prev.plan_id
            || String((plans.find((plan) => plan.is_recommended) || plans[0])?.id || ""),
          billing_cycle: currentSubscription?.billing_cycle || prev.billing_cycle || "monthly",
          auto_renew:
            typeof currentSubscription?.auto_renew === "boolean"
              ? currentSubscription.auto_renew
              : prev.auto_renew,
        }));
      } catch (err) {
        toast.error(extractApiError(err, "Failed to load merchant settings"));
      } finally {
        setLoading(false);
      }
    };

    loadMerchantSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await API.patch("merchant/settings/", {
        store_status: settings.store_status,
        business_hours: settings.business_hours,
      });
      setSettings((prev) => ({
        ...prev,
        store_status: Boolean(res.data?.store_status),
        business_hours: res.data?.business_hours || "",
        current_subscription: res.data?.current_subscription || prev.current_subscription,
        product_usage: res.data?.product_usage || prev.product_usage,
      }));
      toast.success("Store settings updated successfully.");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to update settings"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleActivateSubscription = async () => {
    if (!subscriptionForm.plan_id) {
      toast.error("Please choose a subscription plan.");
      return;
    }
    setSavingSubscription(true);
    try {
      const res = await API.post("merchant/subscription/", {
        plan_id: Number(subscriptionForm.plan_id),
        billing_cycle: subscriptionForm.billing_cycle,
        auto_renew: subscriptionForm.auto_renew,
      });
      setSettings((prev) => ({
        ...prev,
        current_subscription: res.data?.current_subscription || prev.current_subscription,
        product_usage: res.data?.product_usage || prev.product_usage,
      }));
      toast.success(res.data?.message || "Subscription updated successfully.");
    } catch (err) {
      toast.error(extractApiError(err, "Failed to update subscription"));
    } finally {
      setSavingSubscription(false);
    }
  };

  const currentPlan = settings.current_subscription?.plan || null;
  const currentUsage = settings.product_usage;
  const selectedPlanPrice = selectedPlan
    ? subscriptionForm.billing_cycle === "yearly"
      ? selectedPlan.yearly_price
      : selectedPlan.monthly_price
    : 0;

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="admin-page merch-inv-page">
      <div className="merch-inv-header">
        <div className="merch-inv-header-text">
          <h1>
            <FiSettings /> Store Settings
          </h1>
          <p>Manage your store availability, business hours, and subscription plan.</p>
        </div>
      </div>

      <div className="merch-inv-summary">
        <div className="merch-inv-card merch-inv-card-total">
          <div className="merch-inv-card-icon">
            <FiCreditCard />
          </div>
          <div className="merch-inv-card-data">
            <span>Current Plan</span>
            <strong>{currentPlan?.name || "Not Active"}</strong>
          </div>
        </div>
        <div className="merch-inv-card merch-inv-card-active">
          <div className="merch-inv-card-icon">
            <FiLayers />
          </div>
          <div className="merch-inv-card-data">
            <span>Product Usage</span>
            <strong>
              {currentUsage?.product_limit
                ? `${currentUsage.product_count}/${currentUsage.product_limit}`
                : `${currentUsage?.product_count || 0} listed`}
            </strong>
          </div>
        </div>
        <div className="merch-inv-card merch-inv-card-value">
          <div className="merch-inv-card-icon">
            <FiTrendingUp />
          </div>
          <div className="merch-inv-card-data">
            <span>Renewal</span>
            <strong>
              {settings.current_subscription?.ends_at
                ? formatDateTime(settings.current_subscription.ends_at)
                : "Not scheduled"}
            </strong>
          </div>
        </div>
      </div>

      <div className="merch-subscription-panel">
        <div className="merch-subscription-current">
          <div className="merch-subscription-current-head">
            <h2>
              <FiCreditCard /> Active Subscription
            </h2>
            {settings.current_subscription?.status && (
              <span
                className={`merch-inv-stock-badge ${
                  settings.current_subscription.status === "active"
                    ? "badge-success"
                    : "badge-warning"
                }`}
              >
                {settings.current_subscription.status_label
                  || settings.current_subscription.status}
              </span>
            )}
          </div>

          {currentPlan ? (
            <div className="merch-subscription-current-body">
              <div>
                <strong>{currentPlan.name}</strong>
                <p>{currentPlan.short_description}</p>
              </div>
              <div className="merch-subscription-meta">
                <span>
                  {formatCurrency(settings.current_subscription.amount)} /{" "}
                  {settings.current_subscription.billing_cycle_label?.toLowerCase()
                    || settings.current_subscription.billing_cycle}
                </span>
                <span>
                  Ends on {formatDateTime(settings.current_subscription.ends_at)}
                </span>
                <span>
                  {currentUsage?.product_limit
                    ? `${currentUsage.remaining_slots} slots remaining`
                    : "Unlimited product listings"}
                </span>
              </div>
              <ul className="merch-subscription-features">
                {getPlanFeatures(currentPlan).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="merch-subscription-warning">
              No active subscription. Activate a plan below before taking your
              store online or adding new products.
            </div>
          )}
        </div>

        <div className="merch-subscription-selector">
          <h2>Select or change plan</h2>
          <div className="merch-subscription-billing-toggle">
            <button
              type="button"
              className={
                subscriptionForm.billing_cycle === "monthly"
                  ? "merch-billing-btn active"
                  : "merch-billing-btn"
              }
              onClick={() =>
                setSubscriptionForm((prev) => ({
                  ...prev,
                  billing_cycle: "monthly",
                }))
              }
            >
              Monthly
            </button>
            <button
              type="button"
              className={
                subscriptionForm.billing_cycle === "yearly"
                  ? "merch-billing-btn active"
                  : "merch-billing-btn"
              }
              onClick={() =>
                setSubscriptionForm((prev) => ({
                  ...prev,
                  billing_cycle: "yearly",
                }))
              }
            >
              Yearly
            </button>
          </div>

          <div className="merch-plan-grid">
            {availablePlans.map((plan) => {
              const isSelected = String(plan.id) === String(subscriptionForm.plan_id);
              const displayPrice =
                subscriptionForm.billing_cycle === "yearly"
                  ? plan.yearly_price
                  : plan.monthly_price;

              return (
                <button
                  key={plan.id}
                  type="button"
                  className={isSelected ? "merch-plan-card selected" : "merch-plan-card"}
                  onClick={() =>
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      plan_id: String(plan.id),
                    }))
                  }
                >
                  {plan.is_recommended && (
                    <span className="merch-plan-badge">Recommended</span>
                  )}
                  <strong>{plan.name}</strong>
                  <p>{plan.short_description}</p>
                  <div className="merch-plan-price">
                    {formatCurrency(displayPrice)} /{" "}
                    {subscriptionForm.billing_cycle === "yearly" ? "year" : "month"}
                  </div>
                  <ul>
                    {getPlanFeatures(plan).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="merch-subscription-footer">
            <label className="merch-subscription-checkbox">
              <input
                type="checkbox"
                checked={subscriptionForm.auto_renew}
                onChange={(e) =>
                  setSubscriptionForm((prev) => ({
                    ...prev,
                    auto_renew: e.target.checked,
                  }))
                }
              />
              Auto-renew this plan at the end of the cycle
            </label>
            <div className="merch-subscription-footer-action">
              <div>
                <span className="merch-subscription-footer-label">Selected plan price</span>
                <strong>{selectedPlan ? formatCurrency(selectedPlanPrice) : "Choose a plan"}</strong>
              </div>
              <button
                type="button"
                className="merch-btn merch-btn-primary"
                disabled={savingSubscription || !selectedPlan}
                onClick={handleActivateSubscription}
              >
                <FiCreditCard />
                {savingSubscription ? "Updating..." : "Activate Plan"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-card merch-store-settings-card">
        <form
          onSubmit={handleSaveSettings}
          style={{ display: "flex", flexDirection: "column", gap: "25px" }}
        >
          <div>
            <label className="merch-store-settings-label">
              <FiPower /> Store Status
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <label className="switch merch-store-switch">
                <input
                  type="checkbox"
                  checked={settings.store_status}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      store_status: e.target.checked,
                    }))
                  }
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  className={`slider round ${settings.store_status ? "checked" : ""}`}
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: settings.store_status ? "#4ade80" : "#444",
                    transition: ".4s",
                    borderRadius: "34px",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: '""',
                      height: "26px",
                      width: "26px",
                      left: "4px",
                      bottom: "4px",
                      backgroundColor: "white",
                      transition: ".4s",
                      borderRadius: "50%",
                      transform: settings.store_status
                        ? "translateX(26px)"
                        : "none",
                    }}
                  ></span>
                </span>
              </label>
              <span
                style={{
                  fontSize: "1rem",
                  color: settings.store_status ? "#4ade80" : "#888",
                }}
              >
                {settings.store_status
                  ? "Online (Accepting Orders)"
                  : "Offline (Paused)"}
              </span>
            </div>
            <p className="text-muted merch-store-settings-help">
              Turn this off when your store is closed. An active subscription is
              required before you can take the store online.
            </p>
          </div>

          <hr style={{ borderColor: "#333" }} />

          <div>
            <label className="merch-store-settings-label">
              <FiClock /> Business Hours
            </label>
            <input
              type="text"
              value={settings.business_hours}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  business_hours: e.target.value,
                }))
              }
              placeholder="e.g. Mon-Sat, 09:00 AM - 10:00 PM"
              className="input-field"
              style={{
                width: "100%",
                padding: "12px",
                background: "#222",
                border: "1px solid #444",
                borderRadius: "6px",
                color: "#fff",
              }}
            />
            <p className="text-muted merch-store-settings-help">
              Let customers know when you generally operate.
            </p>
          </div>

          <div style={{ marginTop: "10px" }}>
            <button
              type="submit"
              className="btn-save"
              disabled={savingSettings}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                width: "100%",
                justifyContent: "center",
                padding: "12px",
              }}
            >
              <FiSave /> {savingSettings ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
