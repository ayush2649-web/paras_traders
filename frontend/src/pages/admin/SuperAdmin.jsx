import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios";
import useAuth from "../../hooks/useAuth";
import { toast } from "react-toastify";
import {
  FiActivity,
  FiBell,
  FiCheckCircle,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiShield,
  FiTool,
  FiTrash2,
  FiTruck,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { getRoleAccessLabels } from "../../utils/roleAccess";
import "./SuperAdmin.css";

const JOB_ROLE_FALLBACK_OPTIONS = [
  { value: "delivery_partner", label: "Delivery Partner" },
  { value: "merchant_partner", label: "Merchant Partner" },
  { value: "warehouse_associate", label: "Warehouse Associate" },
  { value: "customer_support", label: "Customer Support Executive" },
  { value: "sales_executive", label: "Sales Executive" },
  { value: "frontend_developer", label: "Frontend Developer" },
  { value: "backend_developer", label: "Backend Developer" },
  { value: "uiux_designer", label: "UI/UX Designer" },
  { value: "qa_engineer", label: "QA Engineer" },
  { value: "digital_marketing", label: "Digital Marketing Specialist" },
  { value: "operations_manager", label: "Operations Manager" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function SuperAdmin() {
  const { user: authUser } = useAuth();
  const [searchParams] = useSearchParams();
  const viewParam = (searchParams.get("view") || "").toLowerCase();
  const isAdminsView = viewParam === "admins";
  const isUsersView = viewParam === "users";
  const isEmployeesView = viewParam === "employees";
  const isMerchantsView = viewParam === "merchants";
  const isRoleOnlyView =
    isAdminsView || isUsersView || isEmployeesView || isMerchantsView;
  const showJobApplicationsSection = !isRoleOnlyView || isEmployeesView;
  const showEmployeeHiringPanel = !isAdminsView && !isUsersView;

  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [jobApplications, setJobApplications] = useState([]);
  const [jobsCount, setJobsCount] = useState(0);
  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [decidingJobId, setDecidingJobId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [jobRoleOptions, setJobRoleOptions] = useState(
    JOB_ROLE_FALLBACK_OPTIONS,
  );
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState("add");
  const [userFormRoleKey, setUserFormRoleKey] = useState("customers");
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    id: null,
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    gender: "",
    phone: "",
    city: "",
    state: "",
    employee_role: "",
    is_staff: false,
    is_superuser: false,
    is_seller: false,
    is_active: true,
  });

  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const res = await API.get("super-admin/overview/");
      setOverview(res.data);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || "Failed to load super admin overview",
      );
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const params = { limit: 200 };
      if (isAdminsView) {
        params.role = "superadmin";
      } else if (isMerchantsView) {
        params.role = "merchant";
      } else if (isEmployeesView) {
        params.role = "employee";
      } else if (isUsersView) {
        params.role = "customer";
      }
      if (searchTerm) params.search = searchTerm;
      const res = await API.get("super-admin/users/", { params });
      const results = res.data?.results || [];
      setUsers(results);
      setUsersCount(res.data?.count ?? results.length);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdminsView, isEmployeesView, isMerchantsView, isUsersView, searchTerm]);

  const fetchJobApplications = async () => {
    try {
      setLoadingJobs(true);
      const res = await API.get("super-admin/job-applications/", {
        params: { status: "new", limit: 200 },
      });
      const results = res.data?.results || [];
      setJobApplications(results);
      setJobsCount(res.data?.count ?? results.length);
      setPendingJobsCount(res.data?.pending_count ?? results.length);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || "Failed to load job applications",
      );
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchJobRoles = async () => {
    try {
      const res = await API.get("jobs/roles/");
      const roles = res.data?.roles || [];
      if (roles.length > 0) {
        setJobRoleOptions(
          roles.map((role) => ({ value: role.value, label: role.label })),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobRoles();
    fetchOverview();
    fetchJobApplications();
    const intervalId = setInterval(() => {
      fetchOverview();
      fetchJobApplications();
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const groupedUsers = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        if (user.is_superuser) {
          acc.admins.push(user);
        } else if (user.profile?.employee_role === "merchant_partner") {
          acc.merchants.push(user);
        } else if (user.is_staff || user.profile?.is_seller) {
          acc.employees.push(user);
        } else {
          acc.customers.push(user);
        }
        return acc;
      },
      { admins: [], merchants: [], employees: [], customers: [] },
    );
  }, [users]);

  const roleSummary = useMemo(
    () => ({
      superAdmins: groupedUsers.admins.length,
      merchants: groupedUsers.merchants.length,
      employees: groupedUsers.employees.length,
      customers: groupedUsers.customers.length,
    }),
    [groupedUsers],
  );

  const userTableSections = useMemo(() => {
    const sections = [
      {
        key: "admins",
        title: "Admin",
        rows: groupedUsers.admins,
        emptyMessage: "No admin users found.",
      },
      {
        key: "merchants",
        title: "Merchant",
        rows: groupedUsers.merchants,
        emptyMessage: "No merchants found.",
      },
      {
        key: "employees",
        title: "Employee",
        rows: groupedUsers.employees,
        emptyMessage: "No employees found.",
      },
      {
        key: "customers",
        title: "Customer",
        rows: groupedUsers.customers,
        emptyMessage: "No customers found.",
      },
    ];

    if (isAdminsView) {
      return [sections[0]];
    }

    if (isUsersView) {
      return [sections[3]];
    }

    if (isEmployeesView) {
      return [sections[2]];
    }

    if (isMerchantsView) {
      return [sections[1]];
    }

    return sections;
  }, [
    groupedUsers,
    isAdminsView,
    isUsersView,
    isEmployeesView,
    isMerchantsView,
  ]);

  const onSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
  };

  const scrollToJobApplications = () => {
    const section = document.getElementById("job-applications-section");
    if (!section) {
      toast.info("Job application section is not available in this view");
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── O(1) lookup Map: role value → label ─────────────────────────────
  const jobRoleMap = useMemo(
    () => new Map(jobRoleOptions.map((o) => [o.value, o.label])),
    [jobRoleOptions]
  );

  // ── Role defaults as a lookup table (constant-time access) ───────────
  const ROLE_DEFAULTS_MAP = {
    admins:    { is_staff: true,  is_superuser: false, is_seller: false, is_active: true },
    merchants: { is_staff: true,  is_superuser: false, is_seller: true,  is_active: true },
    employees: { is_staff: true,  is_superuser: false, is_seller: false, is_active: true },
    customers: { is_staff: false, is_superuser: false, is_seller: false, is_active: true },
  };

  const getDefaultEmployeeRoleValue = () => {
    for (const option of jobRoleOptions) {
      if (option.value !== "delivery_partner") return option.value;
    }
    return jobRoleOptions[0]?.value || "";
  };

  const getAccessFlagsFromEmployeeRole = (roleValue) => {
    if (!roleValue) return null;
    if (roleValue === "delivery_partner") return { is_staff: false, is_seller: true };
    return { is_staff: true, is_seller: false };
  };

  const getRoleDefaults = (roleKey) =>
    ROLE_DEFAULTS_MAP[roleKey] ?? ROLE_DEFAULTS_MAP.customers;

  const resetUserForm = () => {
    setUserForm({
      id: null,
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      gender: "",
      phone: "",
      city: "",
      state: "",
      employee_role: "",
      is_staff: false,
      is_superuser: false,
      is_seller: false,
      is_active: true,
    });
  };

  const openAddUserForm = (roleKey) => {
    const fallbackEmployeeRole =
      roleKey === "merchants"
        ? "merchant_partner"
        : getDefaultEmployeeRoleValue();
    setUserFormMode("add");
    setUserFormRoleKey(roleKey);
    const employeeRole =
      roleKey === "employees" || roleKey === "merchants"
        ? fallbackEmployeeRole
        : "";
    const employeeRoleAccess = getAccessFlagsFromEmployeeRole(employeeRole);
    setUserForm({
      id: null,
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      gender: "",
      phone: "",
      city: "",
      state: "",
      ...getRoleDefaults(roleKey),
      employee_role: employeeRole,
      ...(employeeRoleAccess || {}),
    });
    setUserFormOpen(true);
  };

  const openEditUserForm = (targetUser, roleKey) => {
    setUserFormMode("edit");
    setUserFormRoleKey(roleKey);
    const existingEmployeeRole = targetUser.profile?.employee_role || "";
    const inferredEmployeeRole =
      roleKey === "merchants"
        ? "merchant_partner"
        : targetUser.profile?.is_seller
          ? "delivery_partner"
          : getDefaultEmployeeRoleValue();
    const employeeRole =
      roleKey === "employees" || roleKey === "merchants"
        ? existingEmployeeRole || inferredEmployeeRole
        : existingEmployeeRole;
    const employeeRoleAccess =
      roleKey === "employees" || roleKey === "merchants"
        ? getAccessFlagsFromEmployeeRole(employeeRole)
        : null;
    setUserForm({
      id: targetUser.id,
      username: targetUser.username || "",
      email: targetUser.email || "",
      password: "",
      first_name: targetUser.first_name || "",
      last_name: targetUser.last_name || "",
      gender: targetUser.profile?.gender || "",
      phone: targetUser.profile?.phone || "",
      city: targetUser.profile?.city || "",
      state: targetUser.profile?.state || "",
      employee_role: employeeRole,
      is_staff: Boolean(targetUser.is_staff),
      is_superuser: Boolean(targetUser.is_superuser),
      is_seller: Boolean(targetUser.profile?.is_seller),
      is_active: Boolean(targetUser.is_active),
      ...(employeeRoleAccess || {}),
    });
    setUserFormOpen(true);
  };

  const closeUserForm = () => {
    setUserFormOpen(false);
    resetUserForm();
  };

  const handleUserFormChange = (field, value) => {
    if (field === "employee_role") {
      const accessFlags = getAccessFlagsFromEmployeeRole(value);
      setUserForm((prev) => ({
        ...prev,
        [field]: value,
        ...(accessFlags || {}),
      }));
      return;
    }
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserFormToggle = (field, checked) => {
    setUserForm((prev) => ({ ...prev, [field]: checked }));
  };

  const handleSubmitUserForm = async (e) => {
    e.preventDefault();
    if (!userForm.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!userForm.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (
      (userFormRoleKey === "employees" || userFormRoleKey === "merchants") &&
      !String(userForm.employee_role || "").trim()
    ) {
      toast.error("Employee role is required");
      return;
    }

    const payload = {
      username: userForm.username.trim(),
      email: userForm.email.trim(),
      first_name: userForm.first_name.trim(),
      last_name: userForm.last_name.trim(),
      gender: (userForm.gender || "").trim(),
      phone: userForm.phone.trim(),
      city: userForm.city.trim(),
      state: userForm.state.trim(),
      employee_role: (userForm.employee_role || "").trim(),
      is_staff: Boolean(userForm.is_staff),
      is_superuser: Boolean(userForm.is_superuser),
      is_seller: Boolean(userForm.is_seller),
      is_active: Boolean(userForm.is_active),
    };

    try {
      setSavingUser(true);
      if (userFormMode === "add") {
        if (!userForm.password || userForm.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setSavingUser(false);
          return;
        }
        payload.password = userForm.password;
        await API.post("super-admin/users/", payload);
        toast.success("User added successfully");
      } else {
        if (userForm.password) {
          if (userForm.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            setSavingUser(false);
            return;
          }
          payload.password = userForm.password;
        }
        await API.patch(`super-admin/users/${userForm.id}/`, payload);
        toast.success("User updated successfully");
      }

      closeUserForm();
      const refreshTasks = [fetchUsers()];
      if (!isRoleOnlyView) {
        refreshTasks.push(fetchOverview());
      }
      await Promise.all(refreshTasks);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to save user");
    } finally {
      setSavingUser(false);
    }
  };

  const currentFormRoleLabel =
    userFormRoleKey === "admins"
      ? "Admin"
      : userFormRoleKey === "merchants"
        ? "Merchant"
        : userFormRoleKey === "employees"
          ? "Employee"
          : "Customer";

  const formatEntityId = (prefix, id) => {
    if (!id && id !== 0) return "-";
    return `${prefix}-${String(id).padStart(4, "0")}`;
  };

  const formatJoinedDate = (value) =>
    value ? new Date(value).toLocaleDateString("en-IN") : "-";

  const getFullName = (user) => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || "-";
  };

  const getLocation = (user) => {
    const city = user.profile?.city?.trim();
    const state = user.profile?.state?.trim();
    if (city && state) return `${city}, ${state}`;
    return city || state || "-";
  };

  const getEmployeeRole = (user) => {
    const roleValue = user.profile?.employee_role;
    if (roleValue) {
      const label = jobRoleMap.get(roleValue);
      if (label) return label;
    }
    if (user.profile?.is_seller) return "Delivery Partner";
    return "Admin Access";
  };

  const getEmployeeRoleKey = (user) => {
    const existingRole = user.profile?.employee_role;
    if (existingRole) return existingRole;
    if (user.profile?.is_seller) return "delivery_partner";
    // First role in the Map that isn't delivery_partner
    for (const [value] of jobRoleMap) {
      if (value !== "delivery_partner") return value;
    }
    return "";
  };

  const getRoleAccessSummary = (roleValue) => {
    const labels = getRoleAccessLabels(roleValue);
    if (!labels.length) return "Default access";
    return labels.join(", ");
  };

  const handleEmployeeRoleChange = (userId, roleValue) => {
    if (!roleValue) return;
    const roleAccess =
      roleValue === "delivery_partner"
        ? { is_staff: false, is_seller: true }
        : { is_staff: true, is_seller: false };
    updateRole(userId, { ...roleAccess, employee_role: roleValue });
  };

  const renderAdminRows = (rows) =>
    rows.map((user) => {
      const isUpdating = updatingUserId === user.id;
      const isDeleting = deletingUserId === user.id;
      const isPrimaryAdmin = (user.username || "").toLowerCase() === "admin";
      const isCurrentUser = authUser?.id === user.id;
      const canDelete = !isPrimaryAdmin && !isCurrentUser && !isDeleting;
      const canBlock =
        !isPrimaryAdmin && !isCurrentUser && !isUpdating && !isDeleting;

      return (
        <tr key={user.id}>
          <td>
            <span className="role-id-chip">
              {formatEntityId("ADM", user.id)}
            </span>
          </td>
          <td>
            <strong>{user.username}</strong>
            <p className="text-muted">{getFullName(user)}</p>
            <p className="table-inline-meta">
              Joined: {formatJoinedDate(user.date_joined)}
            </p>
          </td>
          <td>
            <div>{user.email || "-"}</div>
            <p className="text-muted">{user.profile?.phone || "-"}</p>
          </td>
          <td>
            <div className="detail-chip-row">
              <span className="detail-chip detail-chip-admin">
                Admin Access
              </span>
              {user.is_superuser && (
                <span className="detail-chip detail-chip-super">
                  Super Admin
                </span>
              )}
              {user.profile?.is_seller && (
                <span className="detail-chip detail-chip-delivery">
                  Delivery Enabled
                </span>
              )}
            </div>
            <p className="table-inline-meta">Location: {getLocation(user)}</p>
          </td>
          <td>
            <div className="role-toggle-grid role-toggle-grid-single">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.is_staff)}
                  disabled={isUpdating || isPrimaryAdmin}
                  onChange={(e) =>
                    updateRole(user.id, { is_staff: e.target.checked })
                  }
                />
                Staff Access
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.is_superuser)}
                  disabled={isUpdating || !isPrimaryAdmin}
                  onChange={(e) =>
                    updateRole(user.id, { is_superuser: e.target.checked })
                  }
                />
                Super Admin
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.profile?.is_seller)}
                  disabled={isUpdating}
                  onChange={(e) =>
                    updateRole(user.id, { is_seller: e.target.checked })
                  }
                />
                Delivery Access
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.is_active)}
                  disabled={isUpdating || isDeleting}
                  onChange={(e) =>
                    updateRole(user.id, { is_active: e.target.checked })
                  }
                />
                Active
              </label>
              <button
                type="button"
                className={`user-block-btn ${user.is_active ? "danger" : "restore"}`}
                disabled={!canBlock}
                onClick={() =>
                  handleToggleBlock(user, {
                    preventSelf: true,
                    preventPrimaryAdmin: true,
                  })
                }
              >
                {user.is_active ? "Block" : "Unblock"}
              </button>
              <button
                type="button"
                className="user-edit-btn"
                disabled={isUpdating || isDeleting}
                onClick={() => openEditUserForm(user, "admins")}
              >
                <FiEdit2 /> Edit
              </button>
              <button
                type="button"
                className="user-delete-btn"
                disabled={!canDelete}
                onClick={() => handleDeleteUser(user)}
              >
                <FiTrash2 /> Delete
              </button>
            </div>
          </td>
        </tr>
      );
    });

  const renderEmployeeRows = (rows, idPrefix = "EMP") =>
    rows.map((user) => {
      const isUpdating = updatingUserId === user.id;
      const isDeleting = deletingUserId === user.id;
      const isCurrentUser = authUser?.id === user.id;
      const canBlock = !isCurrentUser && !isUpdating && !isDeleting;

      return (
        <tr key={user.id}>
          <td>
            <span className="role-id-chip">
              {formatEntityId(idPrefix, user.id)}
            </span>
          </td>
          <td>
            <strong>{user.username}</strong>
            <p className="text-muted">{getFullName(user)}</p>
            <p className="table-inline-meta">
              Joined: {formatJoinedDate(user.date_joined)}
            </p>
          </td>
          <td>
            <div>{user.email || "-"}</div>
            <p className="text-muted">{user.profile?.phone || "-"}</p>
          </td>
          <td>
            <select
              className="employee-role-select"
              value={getEmployeeRoleKey(user)}
              disabled={isUpdating || isDeleting}
              onChange={(e) =>
                handleEmployeeRoleChange(user.id, e.target.value)
              }
            >
              {jobRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="table-inline-meta">
              Current: {getEmployeeRole(user)}
            </p>
            <p className="table-inline-meta">
              Access: {getRoleAccessSummary(getEmployeeRoleKey(user))}
            </p>
            <p className="table-inline-meta">Location: {getLocation(user)}</p>
          </td>
          <td>
            <div className="role-toggle-grid role-toggle-grid-single">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.is_active)}
                  disabled={isUpdating || isDeleting}
                  onChange={(e) =>
                    updateRole(user.id, { is_active: e.target.checked })
                  }
                />
                Active
              </label>
              <button
                type="button"
                className={`user-block-btn ${user.is_active ? "danger" : "restore"}`}
                disabled={!canBlock}
                onClick={() => handleToggleBlock(user, { preventSelf: true })}
              >
                {user.is_active ? "Block" : "Unblock"}
              </button>
              <button
                type="button"
                className="user-edit-btn"
                disabled={isUpdating || isDeleting}
                onClick={() => openEditUserForm(user, "employees")}
              >
                <FiEdit2 /> Edit
              </button>
              <button
                type="button"
                className="user-delete-btn"
                disabled={isDeleting || isCurrentUser}
                onClick={() => handleDeleteUser(user)}
              >
                <FiTrash2 /> Delete
              </button>
            </div>
          </td>
        </tr>
      );
    });

  const renderCustomerRows = (rows) =>
    rows.map((user) => {
      const isUpdating = updatingUserId === user.id;
      const isDeleting = deletingUserId === user.id;
      const isCurrentUser = authUser?.id === user.id;
      const canBlock = !isCurrentUser && !isUpdating && !isDeleting;

      return (
        <tr key={user.id}>
          <td>
            <span className="role-id-chip">
              {formatEntityId("CUS", user.id)}
            </span>
          </td>
          <td>
            <strong>{user.username}</strong>
            <p className="text-muted">{getFullName(user)}</p>
            <p className="table-inline-meta">
              Joined: {formatJoinedDate(user.date_joined)}
            </p>
          </td>
          <td>
            <div>{user.email || "-"}</div>
            <p className="text-muted">{user.profile?.phone || "-"}</p>
          </td>
          <td>
            <p className="table-inline-meta">Location: {getLocation(user)}</p>
            <p className="table-inline-meta">
              Reward Points: {user.profile?.reward_points ?? 0}
            </p>
          </td>
          <td>
            <div className="role-toggle-grid role-toggle-grid-single">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.is_active)}
                  disabled={isUpdating || isDeleting}
                  onChange={(e) =>
                    updateRole(user.id, { is_active: e.target.checked })
                  }
                />
                Active
              </label>
              <button
                type="button"
                className={`user-block-btn ${user.is_active ? "danger" : "restore"}`}
                disabled={!canBlock}
                onClick={() => handleToggleBlock(user, { preventSelf: true })}
              >
                {user.is_active ? "Block" : "Unblock"}
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.is_staff)}
                  disabled={isUpdating || isDeleting}
                  onChange={(e) =>
                    updateRole(user.id, { is_staff: e.target.checked })
                  }
                />
                Promote to Admin Access
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(user.profile?.is_seller)}
                  disabled={isUpdating || isDeleting}
                  onChange={(e) =>
                    updateRole(user.id, { is_seller: e.target.checked })
                  }
                />
                Promote to Delivery
              </label>
              <button
                type="button"
                className="user-delete-btn"
                disabled={isDeleting || isCurrentUser}
                onClick={() => handleDeleteUser(user)}
              >
                <FiTrash2 /> Delete
              </button>
            </div>
          </td>
        </tr>
      );
    });

  const renderSectionTable = (section) => {
    if (section.key === "admins") {
      return (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Admin ID</th>
              <th>Admin</th>
              <th>Contact</th>
              <th>Privileges</th>
              <th>Controls</th>
            </tr>
          </thead>
          <tbody>{renderAdminRows(section.rows)}</tbody>
        </table>
      );
    }

    if (section.key === "employees") {
      return (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee</th>
              <th>Contact</th>
              <th>Employee Role</th>
              <th>Controls</th>
            </tr>
          </thead>
          <tbody>{renderEmployeeRows(section.rows)}</tbody>
        </table>
      );
    }

    if (section.key === "merchants") {
      return (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Merchant ID</th>
              <th>Merchant</th>
              <th>Contact</th>
              <th>Merchant Role</th>
              <th>Controls</th>
            </tr>
          </thead>
          <tbody>{renderEmployeeRows(section.rows, "MRC")}</tbody>
        </table>
      );
    }

    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Customer</th>
            <th>Contact</th>
            <th>Customer Details</th>
            <th>Controls</th>
          </tr>
        </thead>
        <tbody>{renderCustomerRows(section.rows)}</tbody>
      </table>
    );
  };

  const updateRole = async (userId, payload) => {
    try {
      setUpdatingUserId(userId);
      const res = await API.patch(`super-admin/users/${userId}/`, payload);
      const updated = res.data?.user;
      if (updated) {
        setUsers((prev) =>
          prev.map((user) => (user.id === updated.id ? updated : user)),
        );
      } else {
        await fetchUsers();
      }
      await fetchOverview();
      toast.success("User role updated");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to update user role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleBlock = async (targetUser, options = {}) => {
    const { preventSelf = true, preventPrimaryAdmin = false } = options;
    const isPrimaryAdmin =
      (targetUser.username || "").toLowerCase() === "admin";
    const isCurrentUser = authUser?.id === targetUser.id;

    if (preventPrimaryAdmin && isPrimaryAdmin) {
      toast.error("Primary admin account cannot be blocked");
      return;
    }
    if (preventSelf && isCurrentUser) {
      toast.error("You cannot block your own account");
      return;
    }

    const shouldBlock = Boolean(targetUser.is_active);
    const actionText = shouldBlock ? "block" : "unblock";
    const userLabel = targetUser.username || `ID ${targetUser.id}`;
    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} user "${userLabel}"?`,
    );
    if (!confirmed) return;

    await updateRole(targetUser.id, { is_active: !targetUser.is_active });
  };

  const handleDeleteUser = async (targetUser) => {
    const userLabel = targetUser.username || `ID ${targetUser.id}`;
    const confirmed = window.confirm(
      `Delete user "${userLabel}"? This action permanently removes account data.`,
    );
    if (!confirmed) return;

    try {
      setDeletingUserId(targetUser.id);
      await API.delete(`super-admin/users/${targetUser.id}/`);
      toast.success("User deleted");

      const refreshTasks = [fetchUsers()];
      if (!isRoleOnlyView) {
        refreshTasks.push(fetchOverview());
      }
      await Promise.all(refreshTasks);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleJobDecision = async (applicationId, decision) => {
    if (decision === "reject") {
      const confirmed = window.confirm(
        "Reject this application and permanently delete its data?",
      );
      if (!confirmed) return;
    }

    try {
      setDecidingJobId(applicationId);
      const res = await API.post(
        `super-admin/job-applications/${applicationId}/decision/`,
        { decision },
      );
      if (decision === "accept") {
        toast.success(
          `Application accepted. Role authorized as ${res.data?.authorized_role || "assigned"}.`,
        );
      } else {
        toast.success("Application rejected and deleted.");
      }
      await Promise.all([
        fetchOverview(),
        fetchJobApplications(),
        fetchUsers(),
      ]);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to process application");
    } finally {
      setDecidingJobId(null);
    }
  };

  return (
    <div className="admin-page super-admin-page">
      <div className="super-admin-head">
        <div>
          <h1>
            <FiShield /> Super Admin Control Center
          </h1>
          <p>
            {isAdminsView
              ? "Admin view: showing only admin accounts and their controls."
              : isMerchantsView
                ? "Merchant view: showing only merchant partners and their controls."
                : isUsersView
                  ? "Customer view: showing only customer accounts and their controls."
                  : isEmployeesView
                    ? "Employee view: showing only employee accounts and their controls."
                    : "Manage platform-level access, role assignments, and operational health."}
          </p>
        </div>
      </div>

      {showEmployeeHiringPanel && (
        <div className="hire-methods-panel">
          <h2>Hire Team Members</h2>
          <div className="hire-methods-grid">
            <div className="hire-method-card">
              <h3>1. Add Employee Directly</h3>
              <p>
                Create employee account manually and assign role/access
                immediately.
              </p>
              <button
                type="button"
                className="user-add-btn"
                onClick={() => openAddUserForm("employees")}
              >
                <FiPlus /> Add Employee
              </button>
            </div>
            <div className="hire-method-card">
              <h3>2. Add Merchant Directly</h3>
              <p>
                Create a merchant partner account manually and grant
                merchant portal access immediately.
              </p>
              <button
                type="button"
                className="user-add-btn"
                style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}
                onClick={() => openAddUserForm("merchants")}
              >
                <FiPlus /> Add Merchant
              </button>
            </div>
            <div className="hire-method-card">
              <h3>3. Through Application</h3>
              <p>
                Review pending job/merchant applications and accept to
                authorize and hire the candidate — same flow as employees.
              </p>
              <button
                type="button"
                className="user-edit-btn"
                onClick={scrollToJobApplications}
              >
                <FiBell /> Review Applications
              </button>
            </div>
          </div>
        </div>
      )}

      {showJobApplicationsSection && pendingJobsCount > 0 && (
        <div className="job-notification-banner">
          <FiBell />
          <span>
            {pendingJobsCount} new job application
            {pendingJobsCount > 1 ? "s" : ""} awaiting decision.
          </span>
        </div>
      )}

      {!isRoleOnlyView &&
        (loadingOverview ? (
          <div className="page-loader">
            <div className="spinner"></div>
          </div>
        ) : (
          overview && (
            <div className="stats-grid">
              <div className="stat-card">
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(59,130,246,0.1)",
                    color: "#3b82f6",
                  }}
                >
                  <FiUsers />
                </div>
                <div>
                  <p className="stat-value">{overview.total_users}</p>
                  <p className="stat-label">Total Users</p>
                </div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(168,85,247,0.1)",
                    color: "#a855f7",
                  }}
                >
                  <FiShield />
                </div>
                <div>
                  <p className="stat-value">{overview.total_superusers}</p>
                  <p className="stat-label">Super Admins</p>
                </div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(245,166,35,0.1)",
                    color: "#f5a623",
                  }}
                >
                  <FiTool />
                </div>
                <div>
                  <p className="stat-value">{overview.total_admins}</p>
                  <p className="stat-label">Admin Users</p>
                </div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(74,222,128,0.1)",
                    color: "#4ade80",
                  }}
                >
                  <FiTruck />
                </div>
                <div>
                  <p className="stat-value">
                    {overview.total_delivery_partners}
                  </p>
                  <p className="stat-label">Delivery Partners</p>
                </div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(233,69,96,0.1)",
                    color: "#e94560",
                  }}
                >
                  <FiActivity />
                </div>
                <div>
                  <p className="stat-value">{overview.pending_orders}</p>
                  <p className="stat-label">Pending Orders</p>
                </div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(148,163,184,0.12)",
                    color: "#cbd5e1",
                  }}
                >
                  <FiUser />
                </div>
                <div>
                  <p className="stat-value">{overview.active_users}</p>
                  <p className="stat-label">Active Accounts</p>
                </div>
              </div>
              <div className="stat-card">
                <div
                  className="stat-icon"
                  style={{
                    background: "rgba(96,165,250,0.12)",
                    color: "#60a5fa",
                  }}
                >
                  <FiBell />
                </div>
                <div>
                  <p className="stat-value">
                    {overview.pending_job_applications ?? pendingJobsCount}
                  </p>
                  <p className="stat-label">Pending Job Applications</p>
                </div>
              </div>
            </div>
          )
        ))}

      {showJobApplicationsSection && (
        <div className="dashboard-section" id="job-applications-section">
          <div className="jobs-section-head">
            <h2>Job Applications</h2>
            <span className="jobs-pending-chip">
              {pendingJobsCount} Pending
            </span>
          </div>
          {loadingJobs ? (
            <div className="page-loader">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Role</th>
                    <th>Experience</th>
                    <th>Applied At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobApplications.map((application) => (
                    <tr key={application.id}>
                      <td>
                        <strong>{application.full_name}</strong>
                        <p className="text-muted">
                          {application.email} | {application.phone}
                        </p>
                      </td>
                      <td>
                        <strong>
                          {application.role_applied_label ||
                            application.role_applied}
                        </strong>
                        <p className="text-muted">{application.city || "-"}</p>
                        {application.business_name && (
                           <p className="table-inline-meta" style={{color: '#818cf8'}}>Business: {application.business_name}</p>
                        )}
                      </td>
                      <td>{application.experience_years} years</td>
                      <td>
                        {new Date(application.created_at).toLocaleString(
                          "en-IN",
                        )}
                      </td>
                      <td>
                        <div className="job-action-row">
                          <button
                            type="button"
                            className="job-accept-btn"
                            disabled={decidingJobId === application.id}
                            onClick={() =>
                              handleJobDecision(application.id, "accept")
                            }
                          >
                            <FiCheckCircle />
                            {decidingJobId === application.id
                              ? "Processing..."
                              : "Accept"}
                          </button>
                          <button
                            type="button"
                            className="job-reject-btn"
                            disabled={decidingJobId === application.id}
                            onClick={() =>
                              handleJobDecision(application.id, "reject")
                            }
                          >
                            <FiTrash2 />
                            {decidingJobId === application.id
                              ? "Processing..."
                              : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobApplications.length === 0 && (
                <p className="text-muted">
                  No pending job applications right now.
                </p>
              )}
            </div>
          )}
          <p className="jobs-meta-line">
            Showing {jobApplications.length} of {jobsCount} total applications
            matching pending status.
          </p>
        </div>
      )}

      <div className="dashboard-section">
        <h2>
          {isAdminsView
            ? "Admin Management"
            : isMerchantsView
              ? "Merchant Management"
              : isEmployeesView
                ? "Employee Management"
                : isUsersView
                  ? "Customer Management"
                  : "User Access Management"}
        </h2>
        <div className="super-admin-filters">
          <form onSubmit={onSearch} className="super-admin-search">
            <FiSearch />
            <input
              type="text"
              placeholder="Search username, email, phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <div className="super-admin-filter-controls">
            <button type="button" className="clear-btn" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>

        {userFormOpen && (
          <div className="user-form-panel">
            <div className="jobs-section-head">
              <h3>
                {userFormMode === "add"
                  ? `Add ${currentFormRoleLabel}`
                  : `Edit ${currentFormRoleLabel}`}
              </h3>
            </div>
            <form className="user-form-grid" onSubmit={handleSubmitUserForm}>
              <label>
                First Name
                <input
                  type="text"
                  value={userForm.first_name}
                  onChange={(e) =>
                    handleUserFormChange("first_name", e.target.value)
                  }
                />
              </label>
              <label>
                Last Name
                <input
                  type="text"
                  value={userForm.last_name}
                  onChange={(e) =>
                    handleUserFormChange("last_name", e.target.value)
                  }
                />
              </label>
              <label>
                Gender
                <select
                  value={userForm.gender}
                  onChange={(e) =>
                    handleUserFormChange("gender", e.target.value)
                  }
                  required
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Username
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) =>
                    handleUserFormChange("username", e.target.value)
                  }
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    handleUserFormChange("email", e.target.value)
                  }
                  required
                />
              </label>
              <label>
                {userFormMode === "add" ? "Password" : "Password (optional)"}
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    handleUserFormChange("password", e.target.value)
                  }
                  placeholder={
                    userFormMode === "add"
                      ? "Min 6 characters"
                      : "Leave blank to keep unchanged"
                  }
                  required={userFormMode === "add"}
                />
              </label>
              <label>
                Phone
                <input
                  type="text"
                  value={userForm.phone}
                  onChange={(e) =>
                    handleUserFormChange("phone", e.target.value)
                  }
                />
              </label>
              <label>
                City
                <input
                  type="text"
                  value={userForm.city}
                  onChange={(e) => handleUserFormChange("city", e.target.value)}
                />
              </label>
              <label>
                State
                <input
                  type="text"
                  value={userForm.state}
                  onChange={(e) =>
                    handleUserFormChange("state", e.target.value)
                  }
                />
              </label>
              {(userFormRoleKey === "employees" ||
                userFormRoleKey === "merchants") && (
                <label>
                  Employee Role
                  <select
                    className="employee-role-select"
                    value={userForm.employee_role}
                    onChange={(e) =>
                      handleUserFormChange("employee_role", e.target.value)
                    }
                    required
                  >
                    <option value="">Select employee role</option>
                    {jobRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="user-form-helper-text">
                    Access: {getRoleAccessSummary(userForm.employee_role)}
                  </small>
                </label>
              )}

              <div className="user-form-toggles">
                {userFormRoleKey !== "employees" &&
                  userFormRoleKey !== "merchants" && (
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(userForm.is_staff)}
                        onChange={(e) =>
                          handleUserFormToggle("is_staff", e.target.checked)
                        }
                      />
                      Admin Access
                    </label>
                  )}
                {userFormRoleKey !== "employees" &&
                  userFormRoleKey !== "merchants" && (
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(userForm.is_superuser)}
                        onChange={(e) =>
                          handleUserFormToggle("is_superuser", e.target.checked)
                        }
                      />
                      Super Admin
                    </label>
                  )}
                {userFormRoleKey !== "employees" &&
                  userFormRoleKey !== "merchants" && (
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(userForm.is_seller)}
                        onChange={(e) =>
                          handleUserFormToggle("is_seller", e.target.checked)
                        }
                      />
                      Delivery Access
                    </label>
                  )}
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(userForm.is_active)}
                    onChange={(e) =>
                      handleUserFormToggle("is_active", e.target.checked)
                    }
                  />
                  Active
                </label>
                {(userFormRoleKey === "employees" ||
                  userFormRoleKey === "merchants") && (
                  <p className="user-form-helper-text">
                    Access permissions are auto-assigned from selected employee
                    role.
                  </p>
                )}
              </div>

              <div className="user-form-actions">
                <button
                  type="submit"
                  className="user-add-btn"
                  disabled={savingUser}
                >
                  {savingUser
                    ? "Saving..."
                    : userFormMode === "add"
                      ? "Add User"
                      : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="user-edit-btn"
                  onClick={closeUserForm}
                  disabled={savingUser}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="role-summary-row">
          <span>
            Total Matches: <strong>{usersCount}</strong>
          </span>
          {isAdminsView && (
            <span>
              Admins: <strong>{usersCount}</strong>
            </span>
          )}
          {isMerchantsView && (
            <span>
              Merchants: <strong>{usersCount}</strong>
            </span>
          )}
          {isEmployeesView && (
            <span>
              Employees: <strong>{usersCount}</strong>
            </span>
          )}
          {isUsersView && (
            <span>
              Customers: <strong>{usersCount}</strong>
            </span>
          )}
          {!isRoleOnlyView && (
            <>
              <span>
                Super Admins: <strong>{roleSummary.superAdmins}</strong>
              </span>
              <span>
                Merchants: <strong>{roleSummary.merchants}</strong>
              </span>
              <span>
                Employees: <strong>{roleSummary.employees}</strong>
              </span>
              <span>
                Customers: <strong>{roleSummary.customers}</strong>
              </span>
            </>
          )}
        </div>

        {loadingUsers ? (
          <div className="page-loader">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="role-table-stack">
            {userTableSections.map((section) => (
              <div className="role-table-section" key={section.key}>
                <div className="jobs-section-head">
                  <h3>{section.title}</h3>
                  <div className="table-section-actions">
                    {section.key !== "customers" && (
                      <button
                        type="button"
                        className="user-add-btn"
                        onClick={() => openAddUserForm(section.key)}
                      >
                        <FiPlus /> Add {section.title}
                      </button>
                    )}
                    <span className="jobs-pending-chip">
                      {section.rows.length}
                    </span>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  {renderSectionTable(section)}
                  {section.rows.length === 0 && (
                    <p className="text-muted">{section.emptyMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
