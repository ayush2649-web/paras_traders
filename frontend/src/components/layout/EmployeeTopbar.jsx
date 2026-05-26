import { useNavigate, NavLink } from "react-router-dom";
import {
  FiClipboard,
  FiLogOut,
  FiMessageSquare,
  FiShoppingBag,
  FiBarChart2,
} from "react-icons/fi";
import useAuth from "../../hooks/useAuth";

const formatRoleLabel = (role) =>
  String(role || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const topbarNavStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  padding: "0.4rem 0.9rem",
  borderRadius: "7px",
  fontSize: "0.82rem",
  fontWeight: 600,
  textDecoration: "none",
  color: "#94a3b8",
  border: "1px solid transparent",
  transition: "all 0.15s",
};

export default function EmployeeTopbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const roleLabel = user?.is_superuser
    ? "Admin"
    : formatRoleLabel(user?.profile?.employee_role) || "Employee";

  const isMerchant = user?.profile?.employee_role === "merchant_partner";

  const handleLogout = () => {
    logout();
    if (isMerchant) {
      navigate("/merchant", { replace: true });
    } else {
      navigate("/employee/login", { replace: true });
    }
  };

  return (
    <div className="employee-topbar">
      <div className="employee-topbar-inner">
        <div className="employee-topbar-title">
          <strong>{isMerchant ? "Merchant Panel" : "Employee Panel"}</strong>
          <span>{roleLabel}</span>
        </div>

        {/* Merchant Navigation Links */}
        {isMerchant && (
          <nav style={{ display: "flex", gap: "0.4rem" }}>
            <NavLink
              to="/employee/merchant/orders"
              style={({ isActive }) => ({
                ...topbarNavStyle,
                color: isActive ? "#f59e0b" : "#94a3b8",
                background: isActive ? "rgba(245,158,11,0.1)" : "transparent",
                borderColor: isActive ? "rgba(245,158,11,0.2)" : "transparent",
              })}
            >
              <FiShoppingBag /> Orders
            </NavLink>
            <NavLink
              to="/employee/merchant/inventory"
              style={({ isActive }) => ({
                ...topbarNavStyle,
                color: isActive ? "#818cf8" : "#94a3b8",
                background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                borderColor: isActive ? "rgba(99,102,241,0.25)" : "transparent",
              })}
            >
              <FiBarChart2 /> Inventory
            </NavLink>
            <NavLink
              to="/employee/merchant/analytics"
              style={({ isActive }) => ({
                ...topbarNavStyle,
                color: isActive ? "#34d399" : "#94a3b8",
                background: isActive ? "rgba(52,211,153,0.1)" : "transparent",
                borderColor: isActive ? "rgba(52,211,153,0.2)" : "transparent",
              })}
            >
              <FiBarChart2 /> Analytics
            </NavLink>
            <NavLink
              to="/employee/merchant/applications"
              style={({ isActive }) => ({
                ...topbarNavStyle,
                color: isActive ? "#38bdf8" : "#94a3b8",
                background: isActive ? "rgba(56,189,248,0.1)" : "transparent",
                borderColor: isActive ? "rgba(56,189,248,0.22)" : "transparent",
              })}
            >
              <FiClipboard /> Applications
            </NavLink>
            <NavLink
              to="/employee/merchant/questions"
              style={({ isActive }) => ({
                ...topbarNavStyle,
                color: isActive ? "#22d3ee" : "#94a3b8",
                background: isActive ? "rgba(34,211,238,0.1)" : "transparent",
                borderColor: isActive ? "rgba(34,211,238,0.22)" : "transparent",
              })}
            >
              <FiMessageSquare /> Questions
            </NavLink>
            <NavLink
              to="/employee/merchant/settings"
              style={({ isActive }) => ({
                ...topbarNavStyle,
                color: isActive ? "#cbd5e1" : "#94a3b8",
                background: isActive ? "rgba(203,213,225,0.1)" : "transparent",
                borderColor: isActive ? "rgba(203,213,225,0.2)" : "transparent",
              })}
            >
              <FiBarChart2 /> Settings
            </NavLink>
          </nav>
        )}

        <button
          type="button"
          className="employee-topbar-logout"
          onClick={handleLogout}
        >
          <FiLogOut /> Logout
        </button>
      </div>
    </div>
  );
}
