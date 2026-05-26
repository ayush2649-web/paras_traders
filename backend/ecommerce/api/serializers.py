from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
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


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "phone",
            "address",
            "city",
            "state",
            "pincode",
            "gender",
            "employee_role",
            "is_seller",
            "store_status",
            "business_hours",
            "reward_points",
            "daily_login_streak",
            "last_daily_reward",
        ]
        read_only_fields = ["reward_points", "daily_login_streak", "last_daily_reward"]


class MerchantSubscriptionPlanSerializer(serializers.ModelSerializer):
    product_limit_label = serializers.SerializerMethodField()
    estimated_yearly_savings = serializers.SerializerMethodField()

    class Meta:
        model = MerchantSubscriptionPlan
        fields = [
            "id",
            "code",
            "name",
            "short_description",
            "monthly_price",
            "yearly_price",
            "estimated_yearly_savings",
            "product_limit",
            "product_limit_label",
            "commission_rate",
            "priority_support",
            "advanced_analytics",
            "featured_placement",
            "is_recommended",
        ]

    def get_product_limit_label(self, obj):
        return (
            f"Up to {obj.product_limit} product listings"
            if obj.product_limit
            else "Unlimited product listings"
        )

    def get_estimated_yearly_savings(self, obj):
        monthly_cost = obj.monthly_price * 12
        savings = monthly_cost - obj.yearly_price
        return savings if savings > 0 else 0


class MerchantSubscriptionSerializer(serializers.ModelSerializer):
    plan = MerchantSubscriptionPlanSerializer(read_only=True)
    billing_cycle_label = serializers.CharField(
        source="get_billing_cycle_display", read_only=True
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_current = serializers.SerializerMethodField()
    current_product_count = serializers.SerializerMethodField()
    remaining_product_slots = serializers.SerializerMethodField()

    class Meta:
        model = MerchantSubscription
        fields = [
            "id",
            "plan",
            "billing_cycle",
            "billing_cycle_label",
            "status",
            "status_label",
            "amount",
            "starts_at",
            "ends_at",
            "activated_at",
            "cancelled_at",
            "auto_renew",
            "notes",
            "days_remaining",
            "is_current",
            "current_product_count",
            "remaining_product_slots",
            "created_at",
            "updated_at",
        ]

    def get_days_remaining(self, obj):
        if not obj.ends_at:
            return None
        remaining = obj.ends_at - timezone.now()
        return max(remaining.days, 0)

    def get_is_current(self, obj):
        return bool(
            obj.status == "active"
            and obj.starts_at <= timezone.now()
            and obj.ends_at >= timezone.now()
        )

    def get_current_product_count(self, obj):
        return Product.objects.filter(seller=obj.merchant).count()

    def get_remaining_product_slots(self, obj):
        limit = getattr(obj.plan, "product_limit", None)
        if not limit:
            return None
        current_count = self.get_current_product_count(obj)
        return max(limit - current_count, 0)


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
            "profile",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=True)
    gender = serializers.ChoiceField(
        choices=UserProfile.GENDER_CHOICES, required=False, allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password2",
            "first_name",
            "last_name",
            "gender",
        ]

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Email already registered."})
        return data

    def create(self, validated_data):
        gender = validated_data.pop("gender", "")
        validated_data.pop("password2")
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, gender=gender)
        return user


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "description", "image", "product_count"]

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    seller_id = serializers.IntegerField(source="seller.id", read_only=True)
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    avg_rating = serializers.ReadOnlyField()
    review_count = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "price",
            "original_price",
            "image",
            "category",
            "category_name",
            "brand",
            "stock",
            "seller_id",
            "seller_username",
            "is_featured",
            "avg_rating",
            "review_count",
            "discount_percent",
            "created_at",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "username", "rating", "comment", "created_at"]
        read_only_fields = ["user"]


class ProductQuestionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    customer_name = serializers.SerializerMethodField()
    answered_by_username = serializers.CharField(
        source="answered_by.username", read_only=True
    )
    answered_by_name = serializers.SerializerMethodField()
    is_answered = serializers.SerializerMethodField()

    class Meta:
        model = ProductQuestion
        fields = [
            "id",
            "product",
            "user",
            "username",
            "customer_name",
            "question",
            "answer",
            "is_answered",
            "answered_by",
            "answered_by_username",
            "answered_by_name",
            "created_at",
            "answered_at",
            "updated_at",
        ]
        read_only_fields = [
            "product",
            "user",
            "username",
            "customer_name",
            "answer",
            "is_answered",
            "answered_by",
            "answered_by_username",
            "answered_by_name",
            "created_at",
            "answered_at",
            "updated_at",
        ]

    def _display_name(self, user):
        if not user:
            return "Customer"
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.username

    def get_customer_name(self, obj):
        return self._display_name(obj.user)

    def get_answered_by_name(self, obj):
        if not obj.answered_by:
            return ""
        return self._display_name(obj.answered_by)

    def get_is_answered(self, obj):
        return bool(str(obj.answer or "").strip())

    def validate_question(self, value):
        cleaned = str(value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Question cannot be empty.")
        return cleaned


class MerchantProductQuestionSerializer(ProductQuestionSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta(ProductQuestionSerializer.Meta):
        fields = [
            "id",
            "product_id",
            "product_name",
            "user",
            "username",
            "customer_name",
            "question",
            "answer",
            "is_answered",
            "answered_by",
            "answered_by_username",
            "answered_by_name",
            "created_at",
            "answered_at",
            "updated_at",
        ]
        read_only_fields = fields


class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    seller_id = serializers.IntegerField(source="seller.id", read_only=True)
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    avg_rating = serializers.ReadOnlyField()
    review_count = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "original_price",
            "image",
            "category",
            "category_name",
            "brand",
            "stock",
            "seller_id",
            "seller_username",
            "is_featured",
            "is_active",
            "avg_rating",
            "review_count",
            "discount_percent",
            "reviews",
            "created_at",
            "updated_at",
        ]


class CartSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ["id", "product", "product_id", "quantity", "total_price", "added_at"]


class WishlistSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "product", "product_id", "added_at"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "payment_method",
            "transaction_id",
            "amount",
            "status",
            "paid_at",
        ]


class ScratchCardSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    order_total = serializers.DecimalField(
        source="order.total_amount", max_digits=12, decimal_places=2, read_only=True
    )
    reward_points = serializers.SerializerMethodField()

    def get_reward_points(self, obj):
        return obj.reward_points if obj.is_revealed else None

    class Meta:
        model = RewardScratchCard
        fields = [
            "id",
            "title",
            "order_id",
            "order_total",
            "is_revealed",
            "reward_points",
            "revealed_at",
            "created_at",
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.ImageField(source="product.image", read_only=True)
    total_price = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_image",
            "quantity",
            "price",
            "total_price",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    payment = PaymentSerializer(read_only=True)
    delivery_slot_label = serializers.CharField(
        source="get_delivery_slot_display", read_only=True
    )
    assigned_delivery_partner = serializers.IntegerField(
        source="assigned_delivery_partner.id", read_only=True
    )
    assigned_delivery_partner_username = serializers.CharField(
        source="assigned_delivery_partner.username", read_only=True
    )
    assignment_status_label = serializers.CharField(
        source="get_assignment_status_display", read_only=True
    )
    delivery_otp_required = serializers.SerializerMethodField()
    delivery_otp_verified = serializers.SerializerMethodField()
    customer_delivery_otp = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "username",
            "order_date",
            "total_amount",
            "status",
            "shipping_name",
            "shipping_address",
            "shipping_city",
            "shipping_state",
            "shipping_pincode",
            "shipping_phone",
            "delivery_date",
            "delivery_slot",
            "delivery_slot_label",
            "eco_delivery",
            "payment_method",
            "assigned_delivery_partner",
            "assigned_delivery_partner_username",
            "assignment_status",
            "assignment_status_label",
            "tracking_code",
            "delivery_otp_required",
            "delivery_otp_verified",
            "delivery_otp_generated_at",
            "delivery_otp_verified_at",
            "customer_delivery_otp",
            "confirmed_at",
            "assigned_at",
            "delivery_accepted_at",
            "shipped_at",
            "delivered_at",
            "items",
            "payment",
            "updated_at",
        ]
        read_only_fields = ["user", "total_amount", "status"]

    def _is_order_owner(self, obj):
        request = (
            self.context.get("request") if isinstance(self.context, dict) else None
        )
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and request.user.id == obj.user_id
        )

    def get_delivery_otp_required(self, obj):
        return bool(
            obj.status == "shipped"
            and obj.assignment_status == "accepted"
            and not obj.delivery_otp_verified_at
        )

    def get_delivery_otp_verified(self, obj):
        return bool(obj.delivery_otp_verified_at)

    def get_customer_delivery_otp(self, obj):
        if not self._is_order_owner(obj):
            return None
        if obj.status != "shipped":
            return None
        return obj.delivery_otp_code or None


class OrderCreateSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=200)
    shipping_address = serializers.CharField()
    shipping_city = serializers.CharField(max_length=100)
    shipping_state = serializers.CharField(max_length=100)
    shipping_pincode = serializers.CharField(max_length=10)
    shipping_phone = serializers.CharField(max_length=15)
    delivery_date = serializers.DateField()
    delivery_slot = serializers.ChoiceField(choices=Order.DELIVERY_SLOT_CHOICES)
    eco_delivery = serializers.BooleanField(required=False, default=False)
    payment_method = serializers.CharField(max_length=50, default="COD")
    save_address = serializers.BooleanField(required=False, default=False)

    def validate_delivery_date(self, value):
        today = timezone.localdate()
        max_date = today + timedelta(days=14)
        if value < today:
            raise serializers.ValidationError("Delivery date cannot be in the past.")
        if value > max_date:
            raise serializers.ValidationError(
                "Delivery date must be within the next 14 days."
            )
        return value


class DeliveryNotificationSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    delivery_date = serializers.DateField(source="order.delivery_date", read_only=True)
    delivery_slot = serializers.CharField(source="order.delivery_slot", read_only=True)
    delivery_slot_label = serializers.CharField(
        source="order.get_delivery_slot_display", read_only=True
    )
    shipping_city = serializers.CharField(source="order.shipping_city", read_only=True)

    class Meta:
        model = DeliveryNotification
        fields = [
            "id",
            "order_id",
            "order_status",
            "delivery_date",
            "delivery_slot",
            "delivery_slot_label",
            "shipping_city",
            "title",
            "message",
            "is_read",
            "created_at",
        ]


class AdminProductSerializer(serializers.ModelSerializer):
    """Serializer for admin product creation/editing."""

    class Meta:
        model = Product
        fields = "__all__"


class JobApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = [
            "full_name",
            "email",
            "phone",
            "city",
            "role_applied",
            "business_name",
            "selected_subscription_plan",
            "selected_billing_cycle",
            "experience_years",
            "resume_url",
            "portfolio_url",
            "message",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        role_applied = attrs.get("role_applied")
        selected_plan = attrs.get("selected_subscription_plan")
        selected_billing_cycle = str(
            attrs.get("selected_billing_cycle", "") or ""
        ).strip()

        if role_applied == "merchant_partner":
            if not str(attrs.get("business_name", "") or "").strip():
                raise serializers.ValidationError(
                    {"business_name": "Business name is required for merchants."}
                )
            if not selected_plan:
                raise serializers.ValidationError(
                    {
                        "selected_subscription_plan": "Please choose a subscription plan."
                    }
                )
            valid_cycles = dict(MerchantSubscriptionPlan.BILLING_CYCLE_CHOICES)
            if selected_billing_cycle not in valid_cycles:
                raise serializers.ValidationError(
                    {
                        "selected_billing_cycle": "Please choose a valid billing cycle."
                    }
                )
            if not selected_plan.is_active:
                raise serializers.ValidationError(
                    {
                        "selected_subscription_plan": "The selected plan is no longer available."
                    }
                )
        else:
            attrs["selected_subscription_plan"] = None
            attrs["selected_billing_cycle"] = ""

        return attrs

    def create(self, validated_data):
        selected_plan = validated_data.get("selected_subscription_plan")
        selected_billing_cycle = validated_data.get("selected_billing_cycle", "")
        if selected_plan and selected_billing_cycle:
            validated_data["selected_subscription_amount"] = (
                selected_plan.get_price_for_cycle(selected_billing_cycle)
            )
        return super().create(validated_data)


class JobApplicationAdminSerializer(serializers.ModelSerializer):
    role_applied_label = serializers.CharField(
        source="get_role_applied_display", read_only=True
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    selected_subscription_plan_name = serializers.CharField(
        source="selected_subscription_plan.name", read_only=True
    )
    selected_billing_cycle_label = serializers.CharField(
        source="get_selected_billing_cycle_display", read_only=True
    )

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "applicant_user",
            "full_name",
            "email",
            "phone",
            "city",
            "role_applied",
            "role_applied_label",
            "business_name",
            "selected_subscription_plan",
            "selected_subscription_plan_name",
            "selected_billing_cycle",
            "selected_billing_cycle_label",
            "selected_subscription_amount",
            "experience_years",
            "resume_url",
            "portfolio_url",
            "message",
            "status",
            "status_label",
            "created_at",
            "updated_at",
        ]
