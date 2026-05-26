const ALL_ACCESS = {
    dashboard: true,
    orders: true,
    inventory: true,
    delivery: true,
};

const NO_ACCESS = {
    dashboard: false,
    orders: false,
    inventory: false,
    delivery: false,
};

export const EMPLOYEE_ROLE_ACCESS_MAP = {
    delivery_partner: { dashboard: false, orders: false, inventory: false, delivery: true },
    merchant_partner: { dashboard: false, orders: false, inventory: true, delivery: false },
    warehouse_associate: { dashboard: true, orders: true, inventory: true, delivery: false },
    customer_support: { dashboard: true, orders: true, inventory: false, delivery: false },
    sales_executive: { dashboard: true, orders: true, inventory: false, delivery: false },
    frontend_developer: { dashboard: true, orders: false, inventory: false, delivery: false },
    backend_developer: { dashboard: true, orders: false, inventory: false, delivery: false },
    uiux_designer: { dashboard: true, orders: false, inventory: false, delivery: false },
    qa_engineer: { dashboard: true, orders: false, inventory: false, delivery: false },
    digital_marketing: { dashboard: true, orders: false, inventory: false, delivery: false },
    operations_manager: { dashboard: true, orders: true, inventory: true, delivery: false },
};

const EMPLOYEE_ROLE_DEFAULT_PATH_MAP = {
    delivery_partner: '/employee/delivery',
    merchant_partner: '/employee/merchant/inventory',
    warehouse_associate: '/employee/inventory',
    customer_support: '/employee/orders',
    sales_executive: '/employee/orders',
    frontend_developer: '/employee/dashboard',
    backend_developer: '/employee/dashboard',
    uiux_designer: '/employee/dashboard',
    qa_engineer: '/employee/dashboard',
    digital_marketing: '/employee/dashboard',
    operations_manager: '/employee/dashboard',
};

const ACCESS_LABELS = {
    dashboard: 'Dashboard',
    orders: 'Orders',
    inventory: 'Inventory',
    delivery: 'Delivery',
};

const normalizeEmployeeRole = (employeeRole) => String(employeeRole || '').trim();

const cloneAccess = (source) => ({
    dashboard: Boolean(source.dashboard),
    orders: Boolean(source.orders),
    inventory: Boolean(source.inventory),
    delivery: Boolean(source.delivery),
});

export const getRoleBasedAccess = (employeeRole) => {
    const key = normalizeEmployeeRole(employeeRole);
    if (!key) return null;
    const mapped = EMPLOYEE_ROLE_ACCESS_MAP[key];
    return mapped ? cloneAccess(mapped) : null;
};

export const isEmployeeUser = (user) => {
    if (!user || user.is_superuser) return false;
    const employeeRole = normalizeEmployeeRole(user.profile?.employee_role);
    if (employeeRole) return true;
    return Boolean(user.profile?.is_seller);
};

export const isFullAdminUser = (user) => {
    if (!user) return false;
    if (user.is_superuser) return true;
    if (!user.is_staff) return false;
    return !normalizeEmployeeRole(user.profile?.employee_role);
};

export const getUserAccess = (user) => {
    if (!user) return cloneAccess(NO_ACCESS);
    if (isFullAdminUser(user)) return cloneAccess(ALL_ACCESS);

    const mapped = getRoleBasedAccess(user.profile?.employee_role);
    if (mapped) {
        const isStaff = Boolean(user.is_staff);
        mapped.dashboard = isStaff && mapped.dashboard;
        mapped.orders = isStaff && mapped.orders;
        mapped.inventory = isStaff && mapped.inventory;
        return mapped;
    }

    return {
        dashboard: Boolean(user.is_staff),
        orders: Boolean(user.is_staff),
        inventory: Boolean(user.is_staff),
        delivery: Boolean(user.profile?.is_seller),
    };
};

export const canAccessAdminModule = (user, moduleKey) => {
    if (!moduleKey) return Boolean(user?.is_staff || user?.is_superuser);
    return Boolean(getUserAccess(user)[moduleKey]);
};

export const canAccessDeliveryPanel = (user) => {
    if (!user) return false;
    if (isFullAdminUser(user)) return true;
    const employeeRole = normalizeEmployeeRole(user.profile?.employee_role);
    if (employeeRole) {
        return Boolean(getRoleBasedAccess(employeeRole)?.delivery);
    }
    if (user.is_staff) return false;
    return Boolean(user.profile?.is_seller);
};

export const getEmployeeHomePath = (user) => {
    if (!isEmployeeUser(user)) return null;

    const employeeRole = normalizeEmployeeRole(user.profile?.employee_role);
    const mappedRolePath = EMPLOYEE_ROLE_DEFAULT_PATH_MAP[employeeRole];
    if (mappedRolePath) return mappedRolePath;

    const access = getUserAccess(user);
    if (canAccessDeliveryPanel(user)) return '/employee/delivery';
    if (access.inventory) return '/employee/inventory';
    if (access.orders) return '/employee/orders';
    if (access.dashboard) return '/employee/dashboard';

    return null;
};

export const getRoleAccessLabels = (employeeRole) => {
    const access = getRoleBasedAccess(employeeRole);
    if (!access) return [];
    return Object.entries(access)
        .filter(([, isAllowed]) => Boolean(isAllowed))
        .map(([key]) => ACCESS_LABELS[key])
        .filter(Boolean);
};

export const getDefaultPostLoginPath = (user) => {
    if (!user) return '/login';
    if (user.is_superuser) return '/super-admin';
    if (user.profile?.employee_role === 'merchant_partner') return getEmployeeHomePath(user) || '/merchant';
    if (isEmployeeUser(user)) return getEmployeeHomePath(user) || '/employee/login';

    if (user.is_staff) return '/employee/dashboard';

    return '/';
};
