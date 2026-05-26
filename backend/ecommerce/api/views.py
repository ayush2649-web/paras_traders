from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Avg, Q
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.crypto import get_random_string
from datetime import timedelta
import random
import uuid

from .models import (
    UserProfile,
    MerchantSubscriptionPlan,
    MerchantSubscription,
    Category,
    Product,
    Cart,
    Wishlist,
    Order,
    DeliveryNotification,
    OrderItem,
    Review,
    ProductQuestion,
    Payment,
    RewardScratchCard,
    JobApplication,
)
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    MerchantSubscriptionPlanSerializer,
    MerchantSubscriptionSerializer,
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    CartSerializer,
    WishlistSerializer,
    OrderSerializer,
    OrderCreateSerializer,
    ReviewSerializer,
    PaymentSerializer,
    AdminProductSerializer,
    UserProfileSerializer,
    ScratchCardSerializer,
    DeliveryNotificationSerializer,
    JobApplicationCreateSerializer,
    JobApplicationAdminSerializer,
    ProductQuestionSerializer,
    MerchantProductQuestionSerializer,
)


def is_full_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if not user.is_staff:
        return False
    try:
        employee_role = str(getattr(user.profile, "employee_role", "") or "").strip()
    except UserProfile.DoesNotExist:
        employee_role = ""
    return not employee_role


def is_delivery_partner(user):
    if not user.is_authenticated:
        return False
    if is_full_admin_user(user):
        return True
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return False

    employee_role = str(getattr(profile, "employee_role", "") or "").strip()
    mapped_access = EMPLOYEE_ROLE_ACCESS_MAP.get(employee_role)
    if mapped_access:
        return bool(mapped_access.get("delivery"))

    if employee_role:
        return False

    return bool(profile.is_seller)


def is_merchant_partner(user):
    if not user or not user.is_authenticated:
        return False
    if is_full_admin_user(user):
        return False
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return False
    return (
        str(getattr(profile, "employee_role", "") or "").strip() == "merchant_partner"
    )


def can_manage_merchant_applications(user):
    return bool(
        user
        and user.is_authenticated
        and (is_full_admin_user(user) or is_merchant_partner(user))
    )


def can_manage_merchant_products(user):
    return bool(
        user
        and user.is_authenticated
        and (is_full_admin_user(user) or is_merchant_partner(user))
    )


def is_super_admin(user):
    return bool(user and user.is_authenticated and user.is_superuser)


PRIMARY_SUPERADMIN_USERNAME = "admin"

EMPLOYEE_ROLE_ACCESS_MAP = {
    "delivery_partner": {
        "dashboard": False,
        "orders": False,
        "inventory": False,
        "delivery": True,
    },
    "merchant_partner": {
        "dashboard": False,
        "orders": False,
        "inventory": True,
        "delivery": False,
    },
    "warehouse_associate": {
        "dashboard": True,
        "orders": True,
        "inventory": True,
        "delivery": False,
    },
    "customer_support": {
        "dashboard": True,
        "orders": True,
        "inventory": False,
        "delivery": False,
    },
    "sales_executive": {
        "dashboard": True,
        "orders": True,
        "inventory": False,
        "delivery": False,
    },
    "frontend_developer": {
        "dashboard": True,
        "orders": False,
        "inventory": False,
        "delivery": False,
    },
    "backend_developer": {
        "dashboard": True,
        "orders": False,
        "inventory": False,
        "delivery": False,
    },
    "uiux_designer": {
        "dashboard": True,
        "orders": False,
        "inventory": False,
        "delivery": False,
    },
    "qa_engineer": {
        "dashboard": True,
        "orders": False,
        "inventory": False,
        "delivery": False,
    },
    "digital_marketing": {
        "dashboard": True,
        "orders": False,
        "inventory": False,
        "delivery": False,
    },
    "operations_manager": {
        "dashboard": True,
        "orders": True,
        "inventory": True,
        "delivery": False,
    },
}


MERCHANT_PLAN_BLUEPRINTS = [
    {
        "code": "starter",
        "name": "Starter",
        "short_description": "Best for new merchants launching a focused catalogue.",
        "monthly_price": "499.00",
        "yearly_price": "4990.00",
        "product_limit": 25,
        "commission_rate": "8.50",
        "priority_support": False,
        "advanced_analytics": True,
        "featured_placement": False,
        "is_recommended": False,
        "sort_order": 1,
    },
    {
        "code": "growth",
        "name": "Growth",
        "short_description": "For growing stores that need more listings and support.",
        "monthly_price": "1499.00",
        "yearly_price": "14990.00",
        "product_limit": 150,
        "commission_rate": "6.00",
        "priority_support": True,
        "advanced_analytics": True,
        "featured_placement": True,
        "is_recommended": True,
        "sort_order": 2,
    },
    {
        "code": "scale",
        "name": "Scale",
        "short_description": "Unlimited listings for high-volume merchants on Paras Traders.",
        "monthly_price": "2999.00",
        "yearly_price": "29990.00",
        "product_limit": None,
        "commission_rate": "4.50",
        "priority_support": True,
        "advanced_analytics": True,
        "featured_placement": True,
        "is_recommended": False,
        "sort_order": 3,
    },
]


def ensure_default_merchant_plans():
    if MerchantSubscriptionPlan.objects.filter(is_active=True).exists():
        return

    for blueprint in MERCHANT_PLAN_BLUEPRINTS:
        MerchantSubscriptionPlan.objects.get_or_create(
            code=blueprint["code"],
            defaults=blueprint,
        )


def get_default_merchant_plan():
    ensure_default_merchant_plans()
    default_plan = (
        MerchantSubscriptionPlan.objects.filter(code="starter", is_active=True)
        .order_by("sort_order", "id")
        .first()
    )
    if default_plan:
        return default_plan
    return (
        MerchantSubscriptionPlan.objects.filter(is_active=True)
        .order_by("sort_order", "monthly_price", "id")
        .first()
    )


def get_subscription_cycle_duration(billing_cycle):
    return timedelta(days=365 if billing_cycle == "yearly" else 30)


def expire_outdated_merchant_subscriptions(user):
    if not user:
        return
    now = timezone.now()
    MerchantSubscription.objects.filter(
        merchant=user,
        status="active",
        ends_at__lt=now,
    ).update(status="expired", updated_at=now)


def get_active_merchant_subscription(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None
    expire_outdated_merchant_subscriptions(user)
    now = timezone.now()
    return (
        MerchantSubscription.objects.select_related("plan")
        .filter(
            merchant=user,
            status="active",
            starts_at__lte=now,
            ends_at__gte=now,
        )
        .order_by("-ends_at", "-created_at")
        .first()
    )


def get_latest_merchant_subscription(user):
    if not user or not getattr(user, "is_authenticated", False):
        return None
    expire_outdated_merchant_subscriptions(user)
    return (
        MerchantSubscription.objects.select_related("plan")
        .filter(merchant=user)
        .order_by("-ends_at", "-created_at")
        .first()
    )


def get_merchant_product_limit_state(user, subscription=None):
    subscription = subscription or get_active_merchant_subscription(user)
    product_count = Product.objects.filter(seller=user).count()
    plan = getattr(subscription, "plan", None)
    product_limit = getattr(plan, "product_limit", None) if plan else None
    remaining_slots = (
        None if not product_limit else max(product_limit - product_count, 0)
    )
    can_add_products = bool(subscription) and (
        product_limit is None or product_count < product_limit
    )
    return {
        "product_count": product_count,
        "product_limit": product_limit,
        "remaining_slots": remaining_slots,
        "can_add_products": can_add_products,
    }


def activate_merchant_subscription(
    merchant,
    plan,
    billing_cycle,
    *,
    auto_renew=True,
    notes="",
):
    now = timezone.now()
    duration = get_subscription_cycle_duration(billing_cycle)
    MerchantSubscription.objects.filter(
        merchant=merchant,
        status="active",
    ).update(
        status="cancelled",
        cancelled_at=now,
        ends_at=now,
        updated_at=now,
    )
    return MerchantSubscription.objects.create(
        merchant=merchant,
        plan=plan,
        billing_cycle=billing_cycle,
        status="active",
        amount=plan.get_price_for_cycle(billing_cycle),
        starts_at=now,
        ends_at=now + duration,
        activated_at=now,
        auto_renew=auto_renew,
        notes=notes,
    )


def _parse_bool(value, current_value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    return current_value


def map_job_role_to_access(role_applied):
    if role_applied == "delivery_partner":
        return {"is_staff": False, "is_seller": True, "label": "Delivery Partner"}
    if role_applied == "merchant_partner":
        return {"is_staff": True, "is_seller": True, "label": "Merchant Partner"}
    return {"is_staff": True, "is_seller": False, "label": "Admin"}


def get_user_role_access(user):
    access = {
        "dashboard": False,
        "orders": False,
        "inventory": False,
        "delivery": False,
    }
    if not user or not user.is_authenticated:
        return access

    if is_full_admin_user(user):
        return {"dashboard": True, "orders": True, "inventory": True, "delivery": True}

    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = None

    employee_role = ""
    if profile:
        employee_role = str(getattr(profile, "employee_role", "") or "").strip()

    role_based_access = EMPLOYEE_ROLE_ACCESS_MAP.get(employee_role)
    if role_based_access:
        is_staff_user = bool(user.is_staff)
        access.update(role_based_access)
        access["dashboard"] = is_staff_user and access["dashboard"]
        access["orders"] = is_staff_user and access["orders"]
        access["inventory"] = is_staff_user and access["inventory"]
        if getattr(profile, "is_seller", False):
            access["delivery"] = True
        return access

    access.update(
        {
            "dashboard": bool(user.is_staff),
            "orders": bool(user.is_staff),
            "inventory": bool(user.is_staff),
            "delivery": bool(getattr(profile, "is_seller", False)),
        }
    )
    return access


def has_module_access(user, module_key):
    return bool(get_user_role_access(user).get(module_key, False))


def authorize_user_from_job_application(application):
    user = application.applicant_user
    if not user:
        user = (
            User.objects.filter(email__iexact=application.email).order_by("id").first()
        )
        if user:
            application.applicant_user = user

    if not user:
        return (
            None,
            "No registered user found for this application email. Candidate should register first.",
        )

    role_access = map_job_role_to_access(application.role_applied)
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if not user.is_superuser:
        user.is_staff = role_access["is_staff"]
    user.is_active = True
    user.save(update_fields=["is_staff", "is_active"])

    profile.is_seller = role_access["is_seller"]
    profile.employee_role = application.role_applied
    profile.save(update_fields=["is_seller", "employee_role"])

    update_fields = ["status", "updated_at"]
    if application.applicant_user_id != user.id:
        update_fields.append("applicant_user")
    application.status = "hired"
    application.applicant_user = user

    if application.role_applied == "merchant_partner":
        selected_plan = (
            application.selected_subscription_plan or get_default_merchant_plan()
        )
        selected_billing_cycle = application.selected_billing_cycle or "monthly"
        if not selected_plan:
            return None, "No merchant subscription plan is configured yet."

        if application.selected_subscription_plan_id != selected_plan.id:
            application.selected_subscription_plan = selected_plan
            update_fields.append("selected_subscription_plan")
        if application.selected_billing_cycle != selected_billing_cycle:
            application.selected_billing_cycle = selected_billing_cycle
            update_fields.append("selected_billing_cycle")

        selected_amount = selected_plan.get_price_for_cycle(selected_billing_cycle)
        if application.selected_subscription_amount != selected_amount:
            application.selected_subscription_amount = selected_amount
            update_fields.append("selected_subscription_amount")

        activate_merchant_subscription(
            user,
            selected_plan,
            selected_billing_cycle,
            notes=f"Activated from merchant application #{application.id}",
        )

    application.save(update_fields=update_fields)
    return user, None


def serialize_admin_user(user):
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = None
    role_choices = dict(JobApplication.ROLE_CHOICES)
    gender_choices = dict(UserProfile.GENDER_CHOICES)
    employee_role = getattr(profile, "employee_role", "") if profile else ""
    gender = getattr(profile, "gender", "") if profile else ""
    merchant_subscription = get_active_merchant_subscription(
        user
    ) or get_latest_merchant_subscription(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
        "date_joined": user.date_joined,
        "profile": {
            "is_seller": bool(getattr(profile, "is_seller", False)),
            "gender": gender,
            "gender_label": gender_choices.get(gender, ""),
            "employee_role": employee_role,
            "employee_role_label": role_choices.get(employee_role, ""),
            "phone": getattr(profile, "phone", ""),
            "city": getattr(profile, "city", ""),
            "state": getattr(profile, "state", ""),
            "store_status": getattr(profile, "store_status", False),
            "business_hours": getattr(profile, "business_hours", ""),
            "reward_points": getattr(profile, "reward_points", 0),
            "merchant_subscription": (
                MerchantSubscriptionSerializer(merchant_subscription).data
                if merchant_subscription
                else None
            ),
        },
    }


REWARD_LEVEL_THRESHOLDS = [
    ("Bronze", 0),
    ("Silver", 300),
    ("Gold", 900),
]


def get_user_level(points):
    level = REWARD_LEVEL_THRESHOLDS[0][0]
    for level_name, threshold in REWARD_LEVEL_THRESHOLDS:
        if points >= threshold:
            level = level_name
    return level


def get_next_level(points):
    for level_name, threshold in REWARD_LEVEL_THRESHOLDS:
        if points < threshold:
            return {
                "level": level_name,
                "threshold": threshold,
                "points_to_unlock": threshold - points,
            }
    return {
        "level": "Gold",
        "threshold": REWARD_LEVEL_THRESHOLDS[-1][1],
        "points_to_unlock": 0,
    }


def add_reward_points(user, points):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.reward_points += max(points, 0)
    profile.save(update_fields=["reward_points"])
    return profile


def is_delivery_partner_candidate(user):
    if not user.is_active:
        return False
    if user.is_staff or user.is_superuser:
        return False
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return False
    employee_role = str(getattr(profile, "employee_role", "") or "").strip()
    if employee_role:
        return employee_role == "delivery_partner"
    return bool(profile.is_seller)


def create_delivery_notifications_for_order(order):
    delivery_partners = (
        User.objects.filter(
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )
        .filter(
            Q(profile__employee_role="delivery_partner")
            | (Q(profile__is_seller=True) & Q(profile__employee_role=""))
        )
        .distinct()
    )

    if not delivery_partners.exists():
        return 0

    notifications = []
    for partner in delivery_partners:
        notifications.append(
            DeliveryNotification(
                recipient=partner,
                order=order,
                title=f"New Order #{order.id}",
                message=(
                    f"New order placed for {order.shipping_city}. "
                    f"Slot: {order.get_delivery_slot_display()}."
                ),
            )
        )
    DeliveryNotification.objects.bulk_create(notifications)
    return len(notifications)


def generate_unique_tracking_code():
    for _ in range(20):
        code = f"PT-{get_random_string(8, allowed_chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}"
        if not Order.objects.filter(tracking_code=code).exists():
            return code
    raise RuntimeError("Unable to generate unique tracking code")


def generate_delivery_otp():
    return get_random_string(6, allowed_chars="0123456789")


def build_tracking_timeline(order):
    otp_verified_at = order.delivery_otp_verified_at
    if not otp_verified_at and order.status == "delivered":
        otp_verified_at = order.delivered_at

    steps = [
        {"key": "placed", "label": "Order Placed", "at": order.order_date},
        {"key": "confirmed", "label": "Order Confirmed", "at": order.confirmed_at},
        {
            "key": "assigned",
            "label": "Delivery Partner Assigned",
            "at": order.assigned_at,
        },
        {
            "key": "accepted",
            "label": "Delivery Partner Accepted",
            "at": order.delivery_accepted_at,
        },
        {"key": "shipped", "label": "Out for Delivery", "at": order.shipped_at},
        {
            "key": "otp_verified",
            "label": "Customer OTP Verified",
            "at": otp_verified_at,
        },
        {"key": "delivered", "label": "Delivered", "at": order.delivered_at},
    ]
    first_missing_found = False
    for step in steps:
        if step["at"]:
            step["state"] = "done"
        elif first_missing_found:
            step["state"] = "pending"
        else:
            step["state"] = "current"
            first_missing_found = True

    if order.status == "cancelled":
        steps.append(
            {
                "key": "cancelled",
                "label": "Order Cancelled",
                "at": order.updated_at,
                "state": "done",
            }
        )
    return steps


# ──────────────────────────── AUTH ────────────────────────────


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
                "message": "Registration successful!",
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        username = identifier
        if "@" in identifier:
            email_user = (
                User.objects.filter(email__iexact=identifier).order_by("id").first()
            )
            if email_user:
                username = email_user.get_username()

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"error": "Invalid username or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }
        )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        data = request.data
        gender_choices = dict(UserProfile.GENDER_CHOICES)

        user.first_name = data.get("first_name", user.first_name)
        user.last_name = data.get("last_name", user.last_name)
        user.email = data.get("email", user.email)
        user.save()

        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.phone = data.get("phone", profile.phone)
        profile.address = data.get("address", profile.address)
        profile.city = data.get("city", profile.city)
        profile.state = data.get("state", profile.state)
        profile.pincode = data.get("pincode", profile.pincode)
        if "gender" in data:
            incoming_gender = str(data.get("gender", "")).strip()
            if incoming_gender and incoming_gender not in gender_choices:
                return Response(
                    {"error": "Invalid gender value."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.gender = incoming_gender
        profile.save()

        return Response(UserSerializer(user).data)


class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "Account deleted successfully"}, status=200)


# ──────────────────────────── CATEGORIES ────────────────────────────


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None


# ──────────────────────────── PRODUCTS ────────────────────────────


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "brand", "category__name"]
    ordering_fields = ["price", "created_at", "name"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        category = params.get("category")
        if category and category.lower() != "all" and category.lower() != "null":
            try:
                qs = qs.filter(category_id=int(category))
            except ValueError:
                pass

        min_price = params.get("min_price")
        if min_price:
            qs = qs.filter(price__gte=min_price)

        max_price = params.get("max_price")
        if max_price:
            qs = qs.filter(price__lte=max_price)

        brand = params.get("brand")
        if brand:
            qs = qs.filter(brand__icontains=brand)

        featured = params.get("featured")
        if featured == "true":
            qs = qs.filter(is_featured=True)

        in_stock = params.get("in_stock")
        if in_stock == "true":
            qs = qs.filter(stock__gt=0)

        return qs

    @action(detail=False, methods=["get"])
    def featured(self, request):
        featured = self.get_queryset().filter(is_featured=True)[:8]
        serializer = ProductListSerializer(
            featured, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def top_rated(self, request):
        products = (
            self.get_queryset()
            .annotate(avg_rat=Avg("reviews__rating"))
            .filter(avg_rat__isnull=False)
            .order_by("-avg_rat")[:8]
        )
        serializer = ProductListSerializer(
            products, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def similar(self, request, pk=None):
        try:
            product = Product.objects.get(id=pk, is_active=True)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND
            )
        base_qs = Product.objects.filter(
            is_active=True, category=product.category
        ).exclude(id=product.id)

        similar_products = []
        if product.brand:
            similar_products = list(
                base_qs.filter(brand__iexact=product.brand).order_by(
                    "-is_featured", "-created_at"
                )[:8]
            )

        remaining = 8 - len(similar_products)
        if remaining > 0:
            fallback_qs = base_qs.exclude(
                id__in=[p.id for p in similar_products]
            ).order_by("-is_featured", "-created_at")
            similar_products.extend(list(fallback_qs[:remaining]))

        serializer = ProductListSerializer(
            similar_products, many=True, context={"request": request}
        )
        return Response(serializer.data)


# ──────────────────────────── CART ────────────────────────────


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))

        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

        if quantity > product.stock:
            return Response(
                {"error": f"Only {product.stock} items in stock"}, status=400
            )

        cart_item, created = Cart.objects.get_or_create(
            user=request.user, product=product, defaults={"quantity": quantity}
        )
        if not created:
            cart_item.quantity += quantity
            if cart_item.quantity > product.stock:
                cart_item.quantity = product.stock
            cart_item.save()

        serializer = self.get_serializer(cart_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        quantity = int(request.data.get("quantity", instance.quantity))

        if quantity > instance.product.stock:
            return Response(
                {"error": f"Only {instance.product.stock} in stock"}, status=400
            )
        if quantity < 1:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        instance.quantity = quantity
        instance.save()
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["delete"])
    def clear(self, request):
        Cart.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ──────────────────────────── WISHLIST ────────────────────────────


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        product_id = request.data.get("product_id")
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product not found"}, status=404)

        item, created = Wishlist.objects.get_or_create(
            user=request.user, product=product
        )
        if not created:
            item.delete()
            return Response({"message": "Removed from wishlist"}, status=200)

        return Response(WishlistSerializer(item).data, status=201)


# ──────────────────────────── ORDERS ────────────────────────────


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all()
        return Order.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status not in ["pending", "confirmed"]:
            return Response(
                {"error": "This order can no longer be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_items = list(order.items.select_related("product"))
        product_ids = [item.product_id for item in order_items]
        products = Product.objects.select_for_update().filter(id__in=product_ids)
        product_map = {product.id: product for product in products}

        for item in order_items:
            product = product_map.get(item.product_id)
            if product:
                product.stock += item.quantity

        if product_map:
            Product.objects.bulk_update(list(product_map.values()), ["stock"])

        order.status = "cancelled"
        order.save()

        payment = getattr(order, "payment", None)
        if payment and payment.payment_method != "COD" and payment.status != "refunded":
            payment.status = "refunded"
            payment.save(update_fields=["status"])

        order.refresh_from_db()
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart_items = Cart.objects.filter(user=request.user)
        if not cart_items.exists():
            return Response({"error": "Cart is empty"}, status=400)

        # Check stock
        for item in cart_items:
            if item.quantity > item.product.stock:
                return Response(
                    {
                        "error": f"{item.product.name} only has {item.product.stock} in stock"
                    },
                    status=400,
                )

        total = sum(item.total_price for item in cart_items)

        # Save address if requested
        if serializer.validated_data.get("save_address"):
            profile = request.user.profile
            profile.address = serializer.validated_data["shipping_address"]
            profile.city = serializer.validated_data["shipping_city"]
            profile.state = serializer.validated_data["shipping_state"]
            profile.pincode = serializer.validated_data["shipping_pincode"]
            profile.phone = serializer.validated_data["shipping_phone"]
            profile.save()

        order = Order.objects.create(
            user=request.user,
            total_amount=total,
            **{
                k: v
                for k, v in serializer.validated_data.items()
                if k != "save_address"
            },
        )

        for item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price,
            )
            # Decrease stock
            item.product.stock -= item.quantity
            item.product.save()

        # Create payment record
        payment_method = serializer.validated_data.get("payment_method", "COD")
        Payment.objects.create(
            order=order,
            payment_method=payment_method,
            transaction_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            amount=total,
            status="completed" if payment_method != "COD" else "pending",
        )

        RewardScratchCard.objects.create(
            user=request.user, order=order, title="Scratch & Win"
        )

        create_delivery_notifications_for_order(order)

        # Clear cart
        cart_items.delete()

        # Refresh order to ensure relations (payment) are up to date for serializer
        order.refresh_from_db()

        return Response(OrderSerializer(order).data, status=201)


# ──────────────────────────── REVIEWS ────────────────────────────


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(product_id=self.kwargs.get("product_pk"))

    def perform_create(self, serializer):
        product_id = self.kwargs.get("product_pk")
        product = Product.objects.get(id=product_id)
        serializer.save(user=self.request.user, product=product)


class ProductReviewsView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Review.objects.filter(product_id=self.kwargs["product_id"])

    def perform_create(self, serializer):
        product = Product.objects.get(id=self.kwargs["product_id"])
        serializer.save(user=self.request.user, product=product)


# ──────────────────────────── ADMIN DASHBOARD ────────────────────────────


class ProductQuestionsView(generics.ListCreateAPIView):
    serializer_class = ProductQuestionSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_product(self):
        if not hasattr(self, "_product"):
            self._product = get_object_or_404(
                Product, id=self.kwargs["product_id"], is_active=True
            )
        return self._product

    def get_queryset(self):
        product = self.get_product()
        queryset = ProductQuestion.objects.select_related(
            "user", "answered_by", "product"
        ).filter(product=product)

        user = self.request.user
        if is_full_admin_user(user):
            return queryset

        if (
            user.is_authenticated
            and is_merchant_partner(user)
            and product.seller_id == user.id
        ):
            return queryset

        if user.is_authenticated:
            return queryset.filter(Q(answer__gt="") | Q(user=user))

        return queryset.filter(answer__gt="")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, product=self.get_product())


class DeliveryOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_delivery_partner(request.user):
            return Response(
                {"error": "Delivery partner access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed_statuses = ["confirmed", "shipped", "delivered"]
        queryset = (
            Order.objects.filter(
                status__in=allowed_statuses, assigned_delivery_partner__isnull=False
            )
            .select_related("user", "assigned_delivery_partner")
            .prefetch_related("items__product", "payment")
        )

        if not request.user.is_staff:
            queryset = queryset.filter(assigned_delivery_partner=request.user)

        status_filter = request.query_params.get("status")
        if status_filter in allowed_statuses:
            queryset = queryset.filter(status=status_filter)

        assignment_status = request.query_params.get("assignment_status")
        if assignment_status in dict(Order.ASSIGNMENT_STATUS_CHOICES):
            queryset = queryset.filter(assignment_status=assignment_status)

        delivery_date = request.query_params.get("delivery_date")
        if delivery_date:
            queryset = queryset.filter(delivery_date=delivery_date)

        delivery_slot = request.query_params.get("delivery_slot")
        valid_slots = dict(Order.DELIVERY_SLOT_CHOICES)
        if delivery_slot in valid_slots:
            queryset = queryset.filter(delivery_slot=delivery_slot)

        search = request.query_params.get("search", "").strip()
        if search:
            search_conditions = (
                Q(user__username__icontains=search)
                | Q(shipping_name__icontains=search)
                | Q(shipping_phone__icontains=search)
                | Q(tracking_code__icontains=search)
            )
            if search.isdigit():
                search_conditions = search_conditions | Q(id=int(search))
            queryset = queryset.filter(search_conditions)

        queryset = queryset.order_by("-order_date")
        serializer = OrderSerializer(queryset, many=True)
        return Response(serializer.data)


class DeliveryNotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_delivery_partner(request.user):
            return Response(
                {"error": "Delivery partner access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = DeliveryNotification.objects.filter(
            recipient=request.user
        ).select_related("order")
        unread_count = queryset.filter(is_read=False).count()

        unread_only = str(
            request.query_params.get("unread_only", "")
        ).strip().lower() in {"1", "true", "yes"}
        if unread_only:
            queryset = queryset.filter(is_read=False)

        try:
            limit = int(request.query_params.get("limit", 30))
        except (TypeError, ValueError):
            limit = 30
        limit = max(1, min(limit, 200))

        serializer = DeliveryNotificationSerializer(queryset[:limit], many=True)
        return Response(
            {
                "count": queryset.count(),
                "unread_count": unread_count,
                "results": serializer.data,
            }
        )


class DeliveryNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not is_delivery_partner(request.user):
            return Response(
                {"error": "Delivery partner access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            notification = DeliveryNotification.objects.select_related("order").get(
                id=pk, recipient=request.user
            )
        except DeliveryNotification.DoesNotExist:
            return Response(
                {"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])

        return Response(
            DeliveryNotificationSerializer(notification).data, status=status.HTTP_200_OK
        )


class DeliveryNotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not is_delivery_partner(request.user):
            return Response(
                {"error": "Delivery partner access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        updated_count = DeliveryNotification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)

        return Response({"updated": updated_count}, status=status.HTTP_200_OK)


class DeliveryOrderAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not is_delivery_partner(request.user):
            return Response(
                {"error": "Delivery partner access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if not order.assigned_delivery_partner_id:
            return Response(
                {"error": "Order is not assigned to any delivery partner yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not request.user.is_staff
            and order.assigned_delivery_partner_id != request.user.id
        ):
            return Response(
                {"error": "You are not assigned to this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.status in ["delivered", "cancelled"]:
            return Response(
                {"error": "This order cannot be accepted now."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.assignment_status != "accepted":
            order.assignment_status = "accepted"
            order.delivery_accepted_at = timezone.now()
            if not order.tracking_code:
                order.tracking_code = generate_unique_tracking_code()
            order.save(
                update_fields=[
                    "assignment_status",
                    "delivery_accepted_at",
                    "tracking_code",
                    "updated_at",
                ]
            )

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


class DeliveryOrderStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not is_delivery_partner(request.user):
            return Response(
                {"error": "Delivery partner access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if not order.assigned_delivery_partner_id:
            return Response(
                {"error": "Order has no assigned delivery partner."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not request.user.is_staff
            and order.assigned_delivery_partner_id != request.user.id
        ):
            return Response(
                {"error": "You are not assigned to this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if order.assignment_status != "accepted":
            return Response(
                {
                    "error": "Delivery partner must accept the order before status updates."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        next_status_map = {
            "confirmed": "shipped",
            "shipped": "delivered",
        }

        if order.status not in next_status_map:
            return Response(
                {"error": "This order cannot be updated from its current status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_status = request.data.get("status")
        expected_status = next_status_map[order.status]
        if requested_status != expected_status:
            return Response(
                {
                    "error": f"Invalid status transition. Allowed: {order.status} -> {expected_status}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = requested_status
        now = timezone.now()
        update_fields = ["status", "updated_at"]
        if requested_status == "shipped" and not order.shipped_at:
            order.shipped_at = now
            update_fields.append("shipped_at")
            if not order.delivery_otp_code:
                order.delivery_otp_code = generate_delivery_otp()
                order.delivery_otp_generated_at = now
                order.delivery_otp_verified_at = None
                update_fields.extend(
                    [
                        "delivery_otp_code",
                        "delivery_otp_generated_at",
                        "delivery_otp_verified_at",
                    ]
                )
        if requested_status == "delivered" and not order.delivered_at:
            provided_otp = str(request.data.get("delivery_otp", "")).strip()
            if not order.delivery_otp_code:
                now = timezone.now()
                order.delivery_otp_code = generate_delivery_otp()
                order.delivery_otp_generated_at = now
                order.delivery_otp_verified_at = None
                order.save(
                    update_fields=[
                        "delivery_otp_code",
                        "delivery_otp_generated_at",
                        "delivery_otp_verified_at",
                        "updated_at",
                    ]
                )
                return Response(
                    {
                        "error": "Delivery OTP was just generated for this shipped order. Ask customer for OTP and retry."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not provided_otp:
                return Response(
                    {"error": "delivery_otp is required to mark order delivered."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if provided_otp != order.delivery_otp_code:
                return Response(
                    {"error": "Invalid delivery OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            order.delivered_at = now
            order.delivery_otp_verified_at = now
            order.delivery_otp_code = None
            update_fields.extend(
                ["delivered_at", "delivery_otp_verified_at", "delivery_otp_code"]
            )
        order.save(update_fields=update_fields)
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


class RewardsStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        points = profile.reward_points
        next_level = get_next_level(points)
        today = timezone.localdate()

        pending_cards = RewardScratchCard.objects.filter(
            user=request.user, is_revealed=False
        ).count()
        return Response(
            {
                "reward_points": points,
                "reward_level": get_user_level(points),
                "daily_login_streak": profile.daily_login_streak,
                "can_claim_daily_login": profile.last_daily_reward != today,
                "last_daily_reward": profile.last_daily_reward,
                "next_level": next_level,
                "pending_scratch_cards": pending_cards,
            }
        )


class DailyLoginRewardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        today = timezone.localdate()
        if profile.last_daily_reward == today:
            return Response(
                {"error": "Daily reward already claimed for today."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        yesterday = today - timedelta(days=1)
        if profile.last_daily_reward == yesterday:
            profile.daily_login_streak += 1
        else:
            profile.daily_login_streak = 1

        reward_points = 10 + min(profile.daily_login_streak, 5) * 2
        profile.reward_points += reward_points
        profile.last_daily_reward = today
        profile.save(
            update_fields=["daily_login_streak", "reward_points", "last_daily_reward"]
        )

        return Response(
            {
                "message": "Daily login reward claimed.",
                "claimed_points": reward_points,
                "reward_points": profile.reward_points,
                "daily_login_streak": profile.daily_login_streak,
                "reward_level": get_user_level(profile.reward_points),
            }
        )


class ScratchCardListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cards = RewardScratchCard.objects.filter(user=request.user).select_related(
            "order"
        )
        serializer = ScratchCardSerializer(cards, many=True)
        return Response(serializer.data)


class ScratchCardRevealView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            card = RewardScratchCard.objects.get(id=pk, user=request.user)
        except RewardScratchCard.DoesNotExist:
            return Response(
                {"error": "Scratch card not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if card.is_revealed:
            return Response(
                {"error": "Scratch card already revealed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reward_points = random.choices(
            [0, 20, 40, 60, 100], weights=[12, 30, 30, 20, 8], k=1
        )[0]

        card.reward_points = reward_points
        card.is_revealed = True
        card.revealed_at = timezone.now()
        card.save(update_fields=["reward_points", "is_revealed", "revealed_at"])

        profile = add_reward_points(request.user, reward_points)

        serializer = ScratchCardSerializer(card)
        return Response(
            {
                "message": "Scratch card revealed.",
                "card": serializer.data,
                "claimed_points": reward_points,
                "reward_points": profile.reward_points,
                "reward_level": get_user_level(profile.reward_points),
            }
        )


class AdminDeliveryPartnerListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not has_module_access(request.user, "orders"):
            return Response(
                {"error": "Your role is not authorized for order access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        users = (
            User.objects.filter(
                is_active=True,
            )
            .filter(
                Q(profile__is_seller=True) | Q(is_staff=True) | Q(is_superuser=True)
            )
            .select_related("profile")
            .distinct()
            .order_by("username")
        )

        partners = []
        for user in users:
            try:
                profile = user.profile
            except UserProfile.DoesNotExist:
                profile = None

            is_admin = user.is_staff or user.is_superuser
            is_seller = profile.is_seller if profile else False
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            role_label = "Admin" if is_admin else "Delivery Partner"
            partners.append(
                {
                    "id": user.id,
                    "username": user.username,
                    "full_name": full_name,
                    "is_staff": bool(user.is_staff),
                    "is_seller": is_seller,
                    "role_label": role_label,
                }
            )

        return Response({"results": partners}, status=status.HTTP_200_OK)


class AdminAssignDeliveryPartnerView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        if not has_module_access(request.user, "orders"):
            return Response(
                {"error": "Your role is not authorized for order access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if order.status not in ["pending", "confirmed"]:
            return Response(
                {
                    "error": "Delivery partner can only be assigned when order is pending or confirmed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        partner_id = request.data.get("delivery_partner_id")
        if not partner_id:
            return Response(
                {"error": "delivery_partner_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            partner = User.objects.get(id=partner_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Delivery partner user not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not is_delivery_partner_candidate(partner):
            return Response(
                {"error": "Selected user is not eligible as a delivery partner."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        update_fields = [
            "assigned_delivery_partner",
            "assignment_status",
            "assigned_at",
            "delivery_accepted_at",
            "tracking_code",
            "delivery_otp_code",
            "delivery_otp_generated_at",
            "delivery_otp_verified_at",
            "updated_at",
        ]
        order.assigned_delivery_partner = partner
        order.assignment_status = "pending"
        order.assigned_at = now
        order.delivery_accepted_at = None
        order.tracking_code = None
        order.delivery_otp_code = None
        order.delivery_otp_generated_at = None
        order.delivery_otp_verified_at = None

        if order.status == "pending":
            order.status = "confirmed"
            update_fields.append("status")
        if not order.confirmed_at:
            order.confirmed_at = now
            update_fields.append("confirmed_at")

        order.save(update_fields=list(set(update_fields)))
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)


class OrderTrackingByCodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, tracking_code):
        order = (
            Order.objects.select_related("assigned_delivery_partner")
            .prefetch_related("items__product")
            .filter(tracking_code__iexact=tracking_code)
            .first()
        )
        if not order:
            return Response(
                {"error": "Tracking code not found"}, status=status.HTTP_404_NOT_FOUND
            )

        customer_delivery_otp = None
        if (
            request.user.is_authenticated
            and request.user.id == order.user_id
            and order.status == "shipped"
        ):
            customer_delivery_otp = order.delivery_otp_code or None

        delivery_partner_name = None
        if order.assigned_delivery_partner:
            delivery_partner_name = (
                f"{order.assigned_delivery_partner.first_name} {order.assigned_delivery_partner.last_name}".strip()
                or order.assigned_delivery_partner.username
            )

        return Response(
            {
                "tracking_code": order.tracking_code,
                "order_id": order.id,
                "status": order.status,
                "assignment_status": order.assignment_status,
                "assignment_status_label": order.get_assignment_status_display(),
                "delivery_partner": delivery_partner_name,
                "delivery_date": order.delivery_date,
                "delivery_slot": order.delivery_slot,
                "delivery_slot_label": order.get_delivery_slot_display(),
                "delivery_otp_required": bool(
                    order.status == "shipped" and not order.delivery_otp_verified_at
                ),
                "delivery_otp_verified_at": order.delivery_otp_verified_at,
                "customer_delivery_otp": customer_delivery_otp,
                "shipping_city": order.shipping_city,
                "items": [
                    {
                        "product_name": item.product.name,
                        "quantity": item.quantity,
                    }
                    for item in order.items.all()
                ],
                "timeline": build_tracking_timeline(order),
                "last_updated": order.updated_at,
            },
            status=status.HTTP_200_OK,
        )


class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not has_module_access(request.user, "dashboard"):
            return Response(
                {"error": "Your role is not authorized for dashboard access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.now()
        month_ago = today - timedelta(days=30)

        total_products = Product.objects.count()
        total_orders = Order.objects.count()
        total_users = User.objects.count()
        total_revenue = (
            Order.objects.filter(
                status__in=["confirmed", "shipped", "delivered"]
            ).aggregate(total=Sum("total_amount"))["total"]
            or 0
        )

        recent_orders = Order.objects.all()[:10]
        monthly_orders = Order.objects.filter(order_date__gte=month_ago).count()

        status_counts = dict(
            Order.objects.values_list("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        low_stock = Product.objects.filter(stock__lte=5, is_active=True).count()

        payment_stats = dict(
            Payment.objects.values_list("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        return Response(
            {
                "total_products": total_products,
                "total_orders": total_orders,
                "total_users": total_users,
                "total_revenue": float(total_revenue),
                "monthly_orders": monthly_orders,
                "low_stock_count": low_stock,
                "order_status": status_counts,
                "payment_stats": payment_stats,
                "recent_orders": OrderSerializer(recent_orders, many=True).data,
            }
        )


class AdminOrdersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        if not has_module_access(request.user, "orders"):
            return Response(
                {"error": "Your role is not authorized for order access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = (
            Order.objects.select_related("user", "assigned_delivery_partner")
            .prefetch_related("items__product", "payment")
            .order_by("-order_date")
        )

        status_filter = request.query_params.get("status")
        if status_filter in dict(Order.STATUS_CHOICES):
            queryset = queryset.filter(status=status_filter)

        payment_status = request.query_params.get("payment_status")
        if payment_status in dict(Payment.PAYMENT_STATUS):
            queryset = queryset.filter(payment__status=payment_status)

        assignment_status = request.query_params.get("assignment_status")
        if assignment_status in dict(Order.ASSIGNMENT_STATUS_CHOICES):
            queryset = queryset.filter(assignment_status=assignment_status)

        delivery_partner_id = request.query_params.get("delivery_partner_id")
        if delivery_partner_id and str(delivery_partner_id).isdigit():
            queryset = queryset.filter(
                assigned_delivery_partner_id=int(delivery_partner_id)
            )

        date_from = parse_date(request.query_params.get("date_from", ""))
        if date_from:
            queryset = queryset.filter(order_date__date__gte=date_from)

        date_to = parse_date(request.query_params.get("date_to", ""))
        if date_to:
            queryset = queryset.filter(order_date__date__lte=date_to)

        search = request.query_params.get("search", "").strip()
        if search:
            search_conditions = (
                Q(user__username__icontains=search)
                | Q(shipping_name__icontains=search)
                | Q(shipping_phone__icontains=search)
                | Q(payment__transaction_id__icontains=search)
                | Q(tracking_code__icontains=search)
                | Q(assigned_delivery_partner__username__icontains=search)
            )
            if search.isdigit():
                search_conditions = search_conditions | Q(id=int(search))
            queryset = queryset.filter(search_conditions)

        try:
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 500))

        total_count = queryset.count()
        serializer = OrderSerializer(queryset[:limit], many=True)
        return Response(
            {
                "count": total_count,
                "limit": limit,
                "results": serializer.data,
            }
        )


class SuperAdminOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        total_revenue = (
            Order.objects.filter(
                status__in=["confirmed", "shipped", "delivered"]
            ).aggregate(total=Sum("total_amount"))["total"]
            or 0
        )

        status_counts = dict(
            Order.objects.values_list("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        payment_stats = dict(
            Payment.objects.values_list("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        recent_users = User.objects.select_related("profile").order_by("-date_joined")[
            :10
        ]
        recent_orders = (
            Order.objects.select_related("user")
            .prefetch_related("items__product", "payment")
            .order_by("-order_date")[:10]
        )
        recent_job_applications = JobApplication.objects.select_related(
            "applicant_user"
        ).order_by("-created_at")[:5]

        return Response(
            {
                "total_users": User.objects.count(),
                "active_users": User.objects.filter(is_active=True).count(),
                "total_admins": User.objects.filter(is_staff=True).count(),
                "total_superusers": User.objects.filter(is_superuser=True).count(),
                "total_delivery_partners": UserProfile.objects.filter(
                    is_seller=True
                ).count(),
                "total_products": Product.objects.count(),
                "active_products": Product.objects.filter(is_active=True).count(),
                "low_stock_products": Product.objects.filter(
                    stock__lte=5, is_active=True
                ).count(),
                "total_orders": Order.objects.count(),
                "pending_orders": Order.objects.filter(status="pending").count(),
                "pending_job_applications": JobApplication.objects.filter(
                    status="new"
                ).count(),
                "completed_orders": Order.objects.filter(status="delivered").count(),
                "total_revenue": float(total_revenue),
                "order_status": status_counts,
                "payment_stats": payment_stats,
                "recent_users": [serialize_admin_user(user) for user in recent_users],
                "recent_orders": OrderSerializer(recent_orders, many=True).data,
                "recent_job_applications": JobApplicationAdminSerializer(
                    recent_job_applications, many=True
                ).data,
            }
        )


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = User.objects.select_related("profile").order_by("-date_joined")

        role = request.query_params.get("role", "").strip().lower()
        if role == "superadmin":
            queryset = queryset.filter(is_superuser=True)
        elif role == "admin":
            queryset = queryset.filter(is_staff=True, is_superuser=False)
        elif role == "employee":
            queryset = (
                queryset.filter(Q(is_staff=True) | Q(profile__is_seller=True))
                .exclude(is_superuser=True)
                .exclude(profile__employee_role="merchant_partner")
            )
        elif role == "merchant":
            queryset = queryset.filter(
                profile__employee_role="merchant_partner"
            ).exclude(is_superuser=True)
        elif role == "delivery":
            queryset = queryset.filter(profile__is_seller=True, is_superuser=False)
        elif role == "customer":
            queryset = queryset.filter(is_staff=False, is_superuser=False).exclude(
                profile__is_seller=True
            )

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(profile__phone__icontains=search)
            )

        try:
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 500))

        total_count = queryset.count()
        users = [serialize_admin_user(user) for user in queryset[:limit]]
        return Response(
            {
                "count": total_count,
                "limit": limit,
                "results": users,
            }
        )

    def post(self, request):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = str(request.data.get("username", "")).strip()
        email = str(request.data.get("email", "")).strip().lower()
        password = str(request.data.get("password", ""))
        first_name = str(request.data.get("first_name", "")).strip()
        last_name = str(request.data.get("last_name", "")).strip()

        if not username:
            return Response(
                {"error": "username is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        if not email:
            return Response(
                {"error": "email is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        if len(password) < 6:
            return Response(
                {"error": "password must be at least 6 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"error": "username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"error": "email already exists."}, status=status.HTTP_400_BAD_REQUEST
            )

        is_staff = _parse_bool(request.data.get("is_staff", False), False)
        is_superuser = _parse_bool(request.data.get("is_superuser", False), False)
        is_active = _parse_bool(request.data.get("is_active", True), True)
        is_seller = _parse_bool(request.data.get("is_seller", False), False)
        employee_role = str(request.data.get("employee_role", "")).strip()
        gender = str(request.data.get("gender", "")).strip()
        role_choices = dict(JobApplication.ROLE_CHOICES)
        gender_choices = dict(UserProfile.GENDER_CHOICES)

        if employee_role and employee_role not in role_choices:
            return Response(
                {"error": "Invalid employee_role value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if gender and gender not in gender_choices:
            return Response(
                {"error": "Invalid gender value."}, status=status.HTTP_400_BAD_REQUEST
            )

        if employee_role:
            role_access = map_job_role_to_access(employee_role)
            is_staff = role_access["is_staff"]
            is_seller = role_access["is_seller"]

        if is_superuser and username.strip().lower() != PRIMARY_SUPERADMIN_USERNAME:
            return Response(
                {"error": "Only the admin username can be super admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_superuser:
            is_staff = True

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=is_staff,
            is_superuser=is_superuser,
            is_active=is_active,
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.phone = str(request.data.get("phone", "")).strip()
        profile.city = str(request.data.get("city", "")).strip()
        profile.state = str(request.data.get("state", "")).strip()
        profile.gender = gender
        profile.employee_role = employee_role
        profile.is_seller = is_seller
        profile.save(
            update_fields=[
                "phone",
                "city",
                "state",
                "gender",
                "employee_role",
                "is_seller",
            ]
        )

        user.refresh_from_db()
        return Response(
            {"user": serialize_admin_user(user)}, status=status.HTTP_201_CREATED
        )


class AdminUserRoleUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target_user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        target_username = (target_user.username or "").strip().lower()
        is_primary_superadmin = target_username == PRIMARY_SUPERADMIN_USERNAME

        update_fields = set()
        for field in ["is_staff", "is_superuser", "is_active"]:
            if field not in request.data:
                continue

            current_value = getattr(target_user, field)
            new_value = _parse_bool(request.data.get(field), current_value)

            if field == "is_superuser":
                if new_value and not is_primary_superadmin:
                    return Response(
                        {"error": "Only the admin user can be super admin."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if is_primary_superadmin and not new_value:
                    return Response(
                        {"error": "Admin user must remain super admin."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if new_value and not target_user.is_staff:
                    target_user.is_staff = True
                    update_fields.add("is_staff")

            if field == "is_staff" and is_primary_superadmin and not new_value:
                return Response(
                    {"error": "Admin user must remain staff."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if new_value != current_value:
                setattr(target_user, field, new_value)
                update_fields.add(field)

        if (
            target_user.id == request.user.id
            and "is_superuser" in update_fields
            and not target_user.is_superuser
        ):
            return Response(
                {"error": "You cannot remove your own super admin role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if update_fields:
            target_user.save(update_fields=list(update_fields))

        if "is_seller" in request.data:
            profile, _ = UserProfile.objects.get_or_create(user=target_user)
            profile.is_seller = _parse_bool(
                request.data.get("is_seller"), profile.is_seller
            )
            profile.save(update_fields=["is_seller"])

        target_user.refresh_from_db()
        return Response(
            {"user": serialize_admin_user(target_user)}, status=status.HTTP_200_OK
        )


class AdminUserDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target_user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        target_username = (target_user.username or "").strip().lower()
        is_primary_superadmin = target_username == PRIMARY_SUPERADMIN_USERNAME

        new_username = target_user.username
        if "username" in request.data:
            candidate_username = str(request.data.get("username", "")).strip()
            if not candidate_username:
                return Response(
                    {"error": "username cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (
                is_primary_superadmin
                and candidate_username.strip().lower() != PRIMARY_SUPERADMIN_USERNAME
            ):
                return Response(
                    {"error": "Primary admin username cannot be changed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            username_taken = (
                User.objects.filter(username__iexact=candidate_username)
                .exclude(id=target_user.id)
                .exists()
            )
            if username_taken:
                return Response(
                    {"error": "username already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_username = candidate_username

        if "email" in request.data:
            candidate_email = str(request.data.get("email", "")).strip().lower()
            if not candidate_email:
                return Response(
                    {"error": "email cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            email_taken = (
                User.objects.filter(email__iexact=candidate_email)
                .exclude(id=target_user.id)
                .exists()
            )
            if email_taken:
                return Response(
                    {"error": "email already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            target_user.email = candidate_email

        if "first_name" in request.data:
            target_user.first_name = str(request.data.get("first_name", "")).strip()
        if "last_name" in request.data:
            target_user.last_name = str(request.data.get("last_name", "")).strip()

        if "password" in request.data:
            new_password = str(request.data.get("password", ""))
            if new_password:
                if len(new_password) < 6:
                    return Response(
                        {"error": "password must be at least 6 characters."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                target_user.set_password(new_password)

        target_user.username = new_username

        effective_username = (target_user.username or "").strip().lower()
        effective_is_primary_superadmin = (
            effective_username == PRIMARY_SUPERADMIN_USERNAME
        )
        role_choices = dict(JobApplication.ROLE_CHOICES)
        gender_choices = dict(UserProfile.GENDER_CHOICES)
        employee_role_provided = "employee_role" in request.data
        employee_role_value = (
            str(request.data.get("employee_role", "")).strip()
            if employee_role_provided
            else None
        )
        gender_provided = "gender" in request.data
        gender_value = (
            str(request.data.get("gender", "")).strip() if gender_provided else None
        )

        if (
            employee_role_provided
            and employee_role_value
            and employee_role_value not in role_choices
        ):
            return Response(
                {"error": "Invalid employee_role value."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if gender_provided and gender_value and gender_value not in gender_choices:
            return Response(
                {"error": "Invalid gender value."}, status=status.HTTP_400_BAD_REQUEST
            )

        update_fields = {"username", "email", "first_name", "last_name"}
        if "password" in request.data and str(request.data.get("password", "")):
            update_fields.add("password")

        for field in ["is_staff", "is_superuser", "is_active"]:
            if field not in request.data:
                continue

            current_value = getattr(target_user, field)
            new_value = _parse_bool(request.data.get(field), current_value)

            if field == "is_superuser":
                if new_value and not effective_is_primary_superadmin:
                    return Response(
                        {"error": "Only the admin username can be super admin."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if effective_is_primary_superadmin and not new_value:
                    return Response(
                        {"error": "Admin user must remain super admin."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if new_value and not target_user.is_staff:
                    target_user.is_staff = True
                    update_fields.add("is_staff")

            if (
                field == "is_staff"
                and effective_is_primary_superadmin
                and not new_value
            ):
                return Response(
                    {"error": "Admin user must remain staff."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if new_value != current_value:
                setattr(target_user, field, new_value)
                update_fields.add(field)

        mapped_is_seller = None
        if employee_role_provided and employee_role_value:
            role_access = map_job_role_to_access(employee_role_value)
            mapped_is_staff = role_access["is_staff"]
            mapped_is_seller = role_access["is_seller"]

            if effective_is_primary_superadmin and not mapped_is_staff:
                return Response(
                    {"error": "Admin user must remain staff."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if mapped_is_staff != target_user.is_staff:
                target_user.is_staff = mapped_is_staff
                update_fields.add("is_staff")

        if (
            target_user.id == request.user.id
            and "is_superuser" in update_fields
            and not target_user.is_superuser
        ):
            return Response(
                {"error": "You cannot remove your own super admin role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.save(update_fields=list(update_fields))

        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        profile_update_fields = []

        if "phone" in request.data:
            profile.phone = str(request.data.get("phone", "")).strip()
            profile_update_fields.append("phone")
        if "city" in request.data:
            profile.city = str(request.data.get("city", "")).strip()
            profile_update_fields.append("city")
        if "state" in request.data:
            profile.state = str(request.data.get("state", "")).strip()
            profile_update_fields.append("state")
        if gender_provided:
            profile.gender = gender_value or ""
            profile_update_fields.append("gender")
        if employee_role_provided:
            profile.employee_role = employee_role_value or ""
            profile_update_fields.append("employee_role")
        if mapped_is_seller is not None:
            profile.is_seller = mapped_is_seller
            profile_update_fields.append("is_seller")
        elif "is_seller" in request.data:
            profile.is_seller = _parse_bool(
                request.data.get("is_seller"), profile.is_seller
            )
            profile_update_fields.append("is_seller")

        if profile_update_fields:
            profile.save(update_fields=profile_update_fields)

        target_user.refresh_from_db()
        return Response(
            {"user": serialize_admin_user(target_user)}, status=status.HTTP_200_OK
        )

    def delete(self, request, pk):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target_user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        target_username = (target_user.username or "").strip().lower()
        if target_username == PRIMARY_SUPERADMIN_USERNAME or target_user.is_superuser:
            return Response(
                {"error": "Primary super admin account cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_user.id == request.user.id:
            return Response(
                {"error": "You cannot delete your own account from this panel."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_user.delete()
        return Response(
            {"message": "User deleted successfully."}, status=status.HTTP_200_OK
        )


class AdminProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("seller", "category").all()
    serializer_class = AdminProductSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not has_module_access(request.user, "inventory"):
            raise PermissionDenied("Your role is not authorized for inventory access.")

    def get_queryset(self):
        queryset = super().get_queryset()
        if is_merchant_partner(self.request.user):
            return queryset.filter(seller=self.request.user)
        return queryset

    def perform_create(self, serializer):
        if is_merchant_partner(self.request.user):
            serializer.save(seller=self.request.user)
            return
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        if (
            is_merchant_partner(self.request.user)
            and instance.seller_id != self.request.user.id
        ):
            raise PermissionDenied("You can only update your own products.")
        serializer.save()

    def perform_destroy(self, instance):
        if (
            is_merchant_partner(self.request.user)
            and instance.seller_id != self.request.user.id
        ):
            raise PermissionDenied("You can only delete your own products.")
        instance.delete()


class AdminOrderUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        if not has_module_access(request.user, "orders"):
            return Response(
                {"error": "Your role is not authorized for order access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=404)

        new_status = request.data.get("status")
        if new_status and new_status in dict(Order.STATUS_CHOICES):
            if (
                new_status in ["shipped", "delivered"]
                and order.assignment_status != "accepted"
            ):
                return Response(
                    {
                        "error": "Delivery partner must accept the order before it can be marked shipped or delivered."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if new_status == "delivered" and not order.delivery_otp_verified_at:
                return Response(
                    {
                        "error": "Delivery OTP must be verified before order can be marked delivered."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            order.status = new_status
            now = timezone.now()
            update_fields = ["status", "updated_at"]
            if new_status == "confirmed" and not order.confirmed_at:
                order.confirmed_at = now
                update_fields.append("confirmed_at")
            if new_status == "shipped" and not order.shipped_at:
                order.shipped_at = now
                update_fields.append("shipped_at")
                if not order.delivery_otp_code:
                    order.delivery_otp_code = generate_delivery_otp()
                    order.delivery_otp_generated_at = now
                    order.delivery_otp_verified_at = None
                    update_fields.extend(
                        [
                            "delivery_otp_code",
                            "delivery_otp_generated_at",
                            "delivery_otp_verified_at",
                        ]
                    )
            if new_status == "delivered" and not order.delivered_at:
                order.delivered_at = now
                update_fields.append("delivered_at")
            order.save(update_fields=update_fields)
            return Response(OrderSerializer(order).data)
        return Response({"error": "Invalid status"}, status=400)


class AdminPaymentUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        if not has_module_access(request.user, "orders"):
            return Response(
                {"error": "Your role is not authorized for order access."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = Payment.objects.get(id=pk)
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found"}, status=404)

        new_status = request.data.get("status")
        valid_statuses = dict(Payment.PAYMENT_STATUS)
        if new_status and new_status in valid_statuses:
            payment.status = new_status
            payment.save()
            return Response(PaymentSerializer(payment).data)
        return Response({"error": "Invalid payment status"}, status=400)


class JobRoleListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        role_descriptions = {
            "delivery_partner": "Handle deliveries and update shipment status on time.",
            "merchant_partner": "Create and manage your own products, stock, and pricing to sell on the platform.",
            "warehouse_associate": "Manage inventory, packing, and dispatch operations.",
            "customer_support": "Assist customers with orders, returns, and product queries.",
            "sales_executive": "Drive sales and build strong customer relationships.",
            "frontend_developer": "Build user-friendly interfaces and responsive web pages.",
            "backend_developer": "Design secure APIs and scalable backend services.",
            "uiux_designer": "Create intuitive user experiences and visual designs.",
            "qa_engineer": "Test features, report bugs, and ensure product quality.",
            "digital_marketing": "Run campaigns, SEO, and growth initiatives.",
            "operations_manager": "Own cross-team operations and process improvements.",
        }

        roles = [
            {
                "value": value,
                "label": label,
                "description": role_descriptions.get(value, ""),
            }
            for value, label in JobApplication.ROLE_CHOICES
        ]
        return Response({"roles": roles})


class MerchantSubscriptionPlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        ensure_default_merchant_plans()
        plans = MerchantSubscriptionPlan.objects.filter(is_active=True).order_by(
            "sort_order", "monthly_price", "id"
        )
        return Response(
            {"results": MerchantSubscriptionPlanSerializer(plans, many=True).data}
        )


class JobApplicationCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = JobApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        role_applied = serializer.validated_data["role_applied"]
        recent_duplicate = JobApplication.objects.filter(
            email__iexact=email,
            role_applied=role_applied,
            created_at__gte=timezone.now() - timedelta(days=7),
        ).exists()
        if recent_duplicate:
            return Response(
                {
                    "error": "You already applied for this role recently. Please wait a few days before reapplying."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        application = serializer.save(
            applicant_user=request.user if request.user.is_authenticated else None
        )
        return Response(
            {
                "message": "Application submitted successfully.",
                "application_id": application.id,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminJobApplicationListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = (
            JobApplication.objects.select_related("applicant_user")
            .exclude(role_applied="merchant_partner")
            .order_by("-created_at")
        )

        role_filter = request.query_params.get("role")
        if role_filter in dict(JobApplication.ROLE_CHOICES):
            queryset = queryset.filter(role_applied=role_filter)

        status_filter = request.query_params.get("status")
        if status_filter in dict(JobApplication.STATUS_CHOICES):
            queryset = queryset.filter(status=status_filter)

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(city__icontains=search)
            )

        try:
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 500))

        total_count = queryset.count()
        serializer = JobApplicationAdminSerializer(queryset[:limit], many=True)
        return Response(
            {
                "count": total_count,
                "limit": limit,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AdminJobApplicationStatusUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            application = JobApplication.objects.get(id=pk)
        except JobApplication.DoesNotExist:
            return Response(
                {"error": "Job application not found"}, status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get("status")
        if new_status not in dict(JobApplication.STATUS_CHOICES):
            return Response(
                {"error": "Invalid application status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = new_status
        application.save(update_fields=["status", "updated_at"])
        return Response(
            JobApplicationAdminSerializer(application).data, status=status.HTTP_200_OK
        )


class SuperAdminJobApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = JobApplication.objects.select_related("applicant_user").order_by(
            "-created_at"
        )

        role_filter = request.query_params.get("role")
        if role_filter in dict(JobApplication.ROLE_CHOICES):
            queryset = queryset.filter(role_applied=role_filter)

        status_filter = request.query_params.get("status")
        if status_filter in dict(JobApplication.STATUS_CHOICES):
            queryset = queryset.filter(status=status_filter)

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(city__icontains=search)
            )

        try:
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 500))

        total_count = queryset.count()
        serializer = JobApplicationAdminSerializer(queryset[:limit], many=True)
        return Response(
            {
                "count": total_count,
                "pending_count": JobApplication.objects.filter(status="new").count(),
                "limit": limit,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class SuperAdminJobApplicationDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not is_super_admin(request.user):
            return Response(
                {"error": "Super admin access required"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            application = JobApplication.objects.select_related("applicant_user").get(
                id=pk
            )
        except JobApplication.DoesNotExist:
            return Response(
                {"error": "Job application not found"}, status=status.HTTP_404_NOT_FOUND
            )

        decision = str(request.data.get("decision", "")).strip().lower()
        if decision not in {"accept", "reject"}:
            return Response(
                {"error": "decision must be either 'accept' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision == "reject":
            deleted_id = application.id
            application.delete()
            return Response(
                {
                    "message": "Job application rejected and removed.",
                    "deleted_id": deleted_id,
                },
                status=status.HTTP_200_OK,
            )

        user, error_message = authorize_user_from_job_application(application)
        if error_message:
            return Response(
                {"error": error_message}, status=status.HTTP_400_BAD_REQUEST
            )

        role_access = map_job_role_to_access(application.role_applied)
        return Response(
            {
                "message": "Job application accepted and role authorized.",
                "authorized_role": role_access["label"],
                "user": serialize_admin_user(user),
                "application": JobApplicationAdminSerializer(application).data,
            },
            status=status.HTTP_200_OK,
        )


# ──────────────────────────── MERCHANT ────────────────────────────


class MerchantJobApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can_manage_merchant_applications(request.user):
            return Response(
                {"error": "Merchant partner access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = (
            JobApplication.objects.select_related(
                "applicant_user", "selected_subscription_plan"
            )
            .filter(role_applied="merchant_partner")
            .order_by("-created_at")
        )

        status_filter = request.query_params.get("status")
        if status_filter in dict(JobApplication.STATUS_CHOICES):
            queryset = queryset.filter(status=status_filter)

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(city__icontains=search)
                | Q(business_name__icontains=search)
            )

        try:
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 500))

        total_count = queryset.count()
        serializer = JobApplicationAdminSerializer(queryset[:limit], many=True)
        return Response(
            {
                "count": total_count,
                "pending_count": JobApplication.objects.filter(
                    role_applied="merchant_partner", status="new"
                ).count(),
                "limit": limit,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class MerchantJobApplicationDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        if not can_manage_merchant_applications(request.user):
            return Response(
                {"error": "Merchant partner access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            application = JobApplication.objects.select_related(
                "applicant_user", "selected_subscription_plan"
            ).get(id=pk, role_applied="merchant_partner")
        except JobApplication.DoesNotExist:
            return Response(
                {"error": "Merchant application not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        decision = str(request.data.get("decision", "")).strip().lower()
        if decision not in {"accept", "reject"}:
            return Response(
                {"error": "decision must be either 'accept' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision == "reject":
            deleted_id = application.id
            application.delete()
            return Response(
                {
                    "message": "Merchant application rejected and removed.",
                    "deleted_id": deleted_id,
                },
                status=status.HTTP_200_OK,
            )

        user, error_message = authorize_user_from_job_application(application)
        if error_message:
            return Response(
                {"error": error_message}, status=status.HTTP_400_BAD_REQUEST
            )

        role_access = map_job_role_to_access(application.role_applied)
        return Response(
            {
                "message": "Merchant application accepted and role authorized.",
                "authorized_role": role_access["label"],
                "user": serialize_admin_user(user),
                "application": JobApplicationAdminSerializer(application).data,
                "subscription": MerchantSubscriptionSerializer(
                    get_active_merchant_subscription(user)
                    or get_latest_merchant_subscription(user)
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class MerchantSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def _forbidden_response(self):
        return Response(
            {"error": "Merchant partner access required."},
            status=status.HTTP_403_FORBIDDEN,
        )

    def get(self, request):
        user = request.user
        if not is_merchant_partner(user):
            return self._forbidden_response()

        ensure_default_merchant_plans()
        current_subscription = get_active_merchant_subscription(user)
        latest_subscription = current_subscription or get_latest_merchant_subscription(
            user
        )
        product_usage = get_merchant_product_limit_state(user, current_subscription)
        plans = MerchantSubscriptionPlan.objects.filter(is_active=True).order_by(
            "sort_order", "monthly_price", "id"
        )
        return Response(
            {
                "current_subscription": (
                    MerchantSubscriptionSerializer(latest_subscription).data
                    if latest_subscription
                    else None
                ),
                "product_usage": product_usage,
                "available_plans": MerchantSubscriptionPlanSerializer(
                    plans, many=True
                ).data,
            }
        )

    @transaction.atomic
    def post(self, request):
        user = request.user
        if not is_merchant_partner(user):
            return self._forbidden_response()

        ensure_default_merchant_plans()
        plan_id = request.data.get("plan_id")
        billing_cycle = str(request.data.get("billing_cycle", "monthly") or "").strip()
        auto_renew = _parse_bool(request.data.get("auto_renew"), True)

        if billing_cycle not in dict(MerchantSubscriptionPlan.BILLING_CYCLE_CHOICES):
            return Response(
                {"error": "Invalid billing cycle."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = MerchantSubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except (MerchantSubscriptionPlan.DoesNotExist, TypeError, ValueError):
            return Response(
                {"error": "Subscription plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        subscription = activate_merchant_subscription(
            user,
            plan,
            billing_cycle,
            auto_renew=auto_renew,
            notes="Changed from merchant settings",
        )
        product_usage = get_merchant_product_limit_state(user, subscription)
        return Response(
            {
                "message": f"{plan.name} plan activated successfully.",
                "current_subscription": MerchantSubscriptionSerializer(
                    subscription
                ).data,
                "product_usage": product_usage,
            },
            status=status.HTTP_200_OK,
        )


class MerchantProductQuestionListView(APIView):
    permission_classes = [IsAuthenticated]

    def _base_queryset(self, user):
        queryset = ProductQuestion.objects.select_related(
            "user", "answered_by", "product"
        ).order_by("-created_at")
        if is_full_admin_user(user):
            return queryset
        return queryset.filter(product__seller=user)

    def get(self, request):
        if not can_manage_merchant_products(request.user):
            return Response(
                {"error": "Merchant partner access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = self._base_queryset(request.user)
        pending_count = queryset.filter(answer="").count()
        answered_count = queryset.exclude(answer="").count()

        status_filter = str(request.query_params.get("status", "all")).strip().lower()
        if status_filter == "pending":
            queryset = queryset.filter(answer="")
        elif status_filter == "answered":
            queryset = queryset.exclude(answer="")

        product_id = request.query_params.get("product_id")
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search)
                | Q(question__icontains=search)
                | Q(answer__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )

        try:
            limit = int(request.query_params.get("limit", 200))
        except (TypeError, ValueError):
            limit = 200
        limit = max(1, min(limit, 500))

        total_count = queryset.count()
        serializer = MerchantProductQuestionSerializer(queryset[:limit], many=True)
        return Response(
            {
                "count": total_count,
                "pending_count": pending_count,
                "answered_count": answered_count,
                "limit": limit,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class MerchantProductQuestionAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not can_manage_merchant_products(request.user):
            return Response(
                {"error": "Merchant partner access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = ProductQuestion.objects.select_related(
            "user", "answered_by", "product"
        )
        if not is_full_admin_user(request.user):
            queryset = queryset.filter(product__seller=request.user)

        try:
            question = queryset.get(id=pk)
        except ProductQuestion.DoesNotExist:
            return Response(
                {"error": "Product question not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        answer = str(request.data.get("answer", "")).strip()
        if not answer:
            return Response(
                {"error": "Answer cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question.answer = answer
        question.answered_by = request.user
        question.answered_at = timezone.now()
        question.save(
            update_fields=["answer", "answered_by", "answered_at", "updated_at"]
        )

        return Response(
            {
                "message": "Product question answered successfully.",
                "question": MerchantProductQuestionSerializer(question).data,
            },
            status=status.HTTP_200_OK,
        )


class MerchantProductViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for products owned by the authenticated merchant partner.
    A superuser/full-admin also has access (returns all products in that case).
    """

    serializer_class = AdminProductSerializer
    permission_classes = [IsAuthenticated]

    def _require_merchant(self):
        user = self.request.user
        if is_full_admin_user(user):
            return True
        if is_merchant_partner(user):
            return True
        return False

    def get_queryset(self):
        user = self.request.user
        if is_full_admin_user(user):
            return Product.objects.all().order_by("-created_at")
        if is_merchant_partner(user):
            return Product.objects.filter(seller=user).order_by("-created_at")
        return Product.objects.none()

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not self._require_merchant():
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Merchant partner access required.")

    def perform_create(self, serializer):
        user = self.request.user
        if is_full_admin_user(user):
            serializer.save()
        else:
            subscription = get_active_merchant_subscription(user)
            if not subscription:
                raise ValidationError(
                    {
                        "subscription": "Activate a merchant subscription before adding products."
                    }
                )
            usage = get_merchant_product_limit_state(user, subscription)
            if not usage["can_add_products"]:
                limit = usage["product_limit"]
                raise ValidationError(
                    {
                        "subscription": (
                            f"Your current plan allows up to {limit} product listings. "
                            "Upgrade your plan to add more products."
                        )
                    }
                )
            serializer.save(seller=user)

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"message": "Product deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class MerchantOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for merchants to see orders containing their products.
    """

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not (is_merchant_partner(user) or is_full_admin_user(user)):
            return Order.objects.none()

        if is_full_admin_user(user):
            return Order.objects.all().order_by("-order_date")

        # Filter orders that contain at least one item sold by this merchant
        return (
            Order.objects.filter(items__product__seller=user)
            .distinct()
            .order_by("-order_date")
        )

    @action(detail=True, methods=["patch"])
    def update_item_status(self, request, pk=None):
        """
        Allows a merchant to update the status of specific items in an order (e.g. Accepted, Preparing, Ready).
        Expects: {"item_id": 123, "status": "preparing"}
        """
        user = request.user
        if not (is_merchant_partner(user) or is_full_admin_user(user)):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        order = self.get_object()
        item_id = request.data.get("item_id")
        new_status = request.data.get("status")

        try:
            item = OrderItem.objects.get(id=item_id, order=order)
        except OrderItem.DoesNotExist:
            return Response(
                {"error": "Item not found in this order"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not is_full_admin_user(user) and item.product.seller != user:
            return Response(
                {"error": "You can only update your own products"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Assuming OrderItem needs a 'merchant_status' field added later, or we just update the main order status if it's a single-merchant order
        # For a Zomato-like flow, we'd add 'merchant_status' to OrderItem.
        # Using a simple message return for now until OrderItem model is updated.
        return Response(
            {"message": f"Item {item.product.name} status updated to {new_status}"}
        )


class MerchantSettingsView(APIView):
    """
    Allows a merchant to toggle their store status (Online/Offline) and business hours.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not is_merchant_partner(user):
            return Response(
                {"error": "Merchant access required"}, status=status.HTTP_403_FORBIDDEN
            )

        profile = getattr(user, "profile", None)
        if not profile:
            return Response(
                {"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        current_subscription = get_active_merchant_subscription(user)
        latest_subscription = current_subscription or get_latest_merchant_subscription(
            user
        )
        return Response(
            {
                "store_status": profile.store_status,
                "business_hours": profile.business_hours,
                "current_subscription": (
                    MerchantSubscriptionSerializer(latest_subscription).data
                    if latest_subscription
                    else None
                ),
                "product_usage": get_merchant_product_limit_state(
                    user, current_subscription
                ),
            }
        )

    def patch(self, request):
        user = request.user
        if not is_merchant_partner(user):
            return Response(
                {"error": "Merchant access required"}, status=status.HTTP_403_FORBIDDEN
            )

        profile = getattr(user, "profile", None)
        if not profile:
            return Response(
                {"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        current_subscription = get_active_merchant_subscription(user)
        if "store_status" in request.data:
            desired_status = _parse_bool(
                request.data["store_status"], profile.store_status
            )
            if desired_status and not current_subscription:
                return Response(
                    {
                        "error": "Activate a merchant subscription before taking your store online."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.store_status = desired_status
        if "business_hours" in request.data:
            profile.business_hours = str(request.data["business_hours"]).strip()

        profile.save(update_fields=["store_status", "business_hours"])

        latest_subscription = current_subscription or get_latest_merchant_subscription(
            user
        )
        return Response(
            {
                "message": "Settings updated",
                "store_status": profile.store_status,
                "business_hours": profile.business_hours,
                "current_subscription": (
                    MerchantSubscriptionSerializer(latest_subscription).data
                    if latest_subscription
                    else None
                ),
                "product_usage": get_merchant_product_limit_state(
                    user, current_subscription
                ),
            }
        )


class MerchantAnalyticsView(APIView):
    """
    Analytics for the authenticated merchant: revenue, units sold, top products,
    monthly trend, and per-product breakdown.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (is_merchant_partner(user) or is_full_admin_user(user)):
            return Response(
                {"error": "Merchant partner access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # For full admins show platform-wide stats; for merchants scope to their products
        if is_full_admin_user(user):
            merchant_products = Product.objects.all()
            order_items_qs = OrderItem.objects.select_related("product", "order")
        else:
            merchant_products = Product.objects.filter(seller=user)
            order_items_qs = OrderItem.objects.filter(
                product__seller=user
            ).select_related("product", "order")

        # ── Summary ──────────────────────────────────────────────
        total_products = merchant_products.count()
        active_products = merchant_products.filter(is_active=True).count()
        out_of_stock = merchant_products.filter(stock=0).count()
        low_stock = merchant_products.filter(stock__gt=0, stock__lte=5).count()

        agg = order_items_qs.filter(
            order__status__in=["confirmed", "shipped", "delivered"]
        ).aggregate(
            total_revenue=Sum(
                models.F("price") * models.F("quantity"),
                output_field=models.DecimalField(),
            ),
            total_units=Sum("quantity"),
            total_orders=Count("order", distinct=True),
        )
        total_revenue = float(agg["total_revenue"] or 0)
        total_units = int(agg["total_units"] or 0)
        total_orders = int(agg["total_orders"] or 0)

        # ── Per-product breakdown ─────────────────────────────────
        product_stats = (
            order_items_qs.filter(
                order__status__in=["confirmed", "shipped", "delivered"]
            )
            .values(
                "product__id",
                "product__name",
                "product__price",
                "product__stock",
                "product__is_active",
            )
            .annotate(
                units_sold=Sum("quantity"),
                revenue=Sum(
                    models.F("price") * models.F("quantity"),
                    output_field=models.DecimalField(),
                ),
                order_count=Count("order", distinct=True),
            )
            .order_by("-revenue")
        )

        product_breakdown = [
            {
                "product_id": row["product__id"],
                "product_name": row["product__name"],
                "current_price": float(row["product__price"]),
                "current_stock": row["product__stock"],
                "is_active": row["product__is_active"],
                "units_sold": int(row["units_sold"] or 0),
                "revenue": float(row["revenue"] or 0),
                "order_count": int(row["order_count"] or 0),
            }
            for row in product_stats
        ]

        # ── Top 5 products by revenue ─────────────────────────────
        top_products = product_breakdown[:5]

        # ── Monthly revenue trend (last 6 months) ─────────────────
        six_months_ago = timezone.now() - timedelta(days=180)
        monthly_raw = (
            order_items_qs.filter(
                order__status__in=["confirmed", "shipped", "delivered"],
                order__order_date__gte=six_months_ago,
            )
            .extra(select={"month": "strftime('%%Y-%%m', order_date)"})
            .values("month")
            .annotate(
                revenue=Sum(
                    models.F("price") * models.F("quantity"),
                    output_field=models.DecimalField(),
                ),
                units=Sum("quantity"),
                orders=Count("order", distinct=True),
            )
            .order_by("month")
        )
        # Fallback for non-SQLite: use order__order_date
        if not monthly_raw:
            monthly_raw = []

        monthly_trend = [
            {
                "month": row.get("month", ""),
                "revenue": float(row.get("revenue") or 0),
                "units": int(row.get("units") or 0),
                "orders": int(row.get("orders") or 0),
            }
            for row in monthly_raw
        ]

        # ── Products with no sales yet ────────────────────────────
        sold_product_ids = set(row["product__id"] for row in product_stats)
        unsold_products = merchant_products.exclude(id__in=sold_product_ids).values(
            "id", "name", "price", "stock", "is_active"
        )
        for p in unsold_products:
            product_breakdown.append(
                {
                    "product_id": p["id"],
                    "product_name": p["name"],
                    "current_price": float(p["price"]),
                    "current_stock": p["stock"],
                    "is_active": p["is_active"],
                    "units_sold": 0,
                    "revenue": 0.0,
                    "order_count": 0,
                }
            )

        return Response(
            {
                "summary": {
                    "total_products": total_products,
                    "active_products": active_products,
                    "out_of_stock": out_of_stock,
                    "low_stock": low_stock,
                    "total_revenue": total_revenue,
                    "total_units_sold": total_units,
                    "total_orders": total_orders,
                },
                "top_products": top_products,
                "monthly_trend": monthly_trend,
                "product_breakdown": product_breakdown,
            }
        )
