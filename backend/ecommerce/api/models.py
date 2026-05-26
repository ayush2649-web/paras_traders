from datetime import date

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("prefer_not_to_say", "Prefer not to say"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True)
    employee_role = models.CharField(max_length=50, blank=True)
    is_seller = models.BooleanField(default=False)
    store_status = models.BooleanField(default=False)  # For merchant online/offline
    business_hours = models.CharField(max_length=200, blank=True)  # E.g. "09:00 AM - 10:00 PM"
    reward_points = models.PositiveIntegerField(default=0)
    daily_login_streak = models.PositiveIntegerField(default=0)
    last_daily_reward = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


class MerchantSubscriptionPlan(models.Model):
    BILLING_CYCLE_CHOICES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]

    code = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=120)
    short_description = models.CharField(max_length=255, blank=True)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2)
    product_limit = models.PositiveIntegerField(null=True, blank=True)
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    priority_support = models.BooleanField(default=False)
    advanced_analytics = models.BooleanField(default=True)
    featured_placement = models.BooleanField(default=False)
    is_recommended = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "monthly_price", "id"]

    def __str__(self):
        return self.name

    def get_price_for_cycle(self, billing_cycle):
        return self.yearly_price if billing_cycle == "yearly" else self.monthly_price


class MerchantSubscription(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]

    merchant = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="merchant_subscriptions"
    )
    plan = models.ForeignKey(
        MerchantSubscriptionPlan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=MerchantSubscriptionPlan.BILLING_CYCLE_CHOICES,
        default="monthly",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    activated_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["merchant", "status"], name="api_msub_user_stat_idx"),
            models.Index(fields=["ends_at"], name="api_msub_end_idx"),
        ]

    def __str__(self):
        return f"{self.merchant.username} - {self.plan.name} ({self.status})"

    @property
    def is_current(self):
        return (
            self.status == "active"
            and self.starts_at <= timezone.now()
            and self.ends_at >= timezone.now()
        )


class Category(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    seller = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="merchant_products",
    )
    name = models.CharField(max_length=300)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )
    stock = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    brand = models.CharField(max_length=200, blank=True)
    mfg_date = models.DateField(
        null=True, blank=True, verbose_name="Manufacturing Date"
    )
    expiry_date = models.DateField(null=True, blank=True, verbose_name="Expiry Date")
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name

    @property
    def avg_rating(self):
        reviews = self.reviews.all()
        if reviews.exists():
            return round(reviews.aggregate(models.Avg("rating"))["rating__avg"], 1)
        return 0

    @property
    def review_count(self):
        return self.reviews.count()

    @property
    def discount_percent(self):
        if self.original_price and self.original_price > self.price:
            return round(
                ((self.original_price - self.price) / self.original_price) * 100
            )
        return 0


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cart_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")

    def __str__(self):
        return f"{self.user.username} - {self.product.name} x{self.quantity}"

    @property
    def total_price(self):
        return self.product.price * self.quantity


class Wishlist(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="wishlist_items"
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product")

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    ASSIGNMENT_STATUS_CHOICES = [
        ("unassigned", "Unassigned"),
        ("pending", "Pending Delivery Acceptance"),
        ("accepted", "Accepted by Delivery Partner"),
        ("rejected", "Rejected by Delivery Partner"),
    ]
    DELIVERY_SLOT_CHOICES = [
        ("morning", "Morning (9 AM - 12 PM)"),
        ("afternoon", "Afternoon (12 PM - 4 PM)"),
        ("evening", "Evening (4 PM - 9 PM)"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    shipping_name = models.CharField(max_length=200)
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_pincode = models.CharField(max_length=10)
    shipping_phone = models.CharField(max_length=15)
    delivery_date = models.DateField(default=date.today)
    delivery_slot = models.CharField(
        max_length=20, choices=DELIVERY_SLOT_CHOICES, default="evening"
    )
    eco_delivery = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, default="COD")
    assigned_delivery_partner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_orders",
    )
    assignment_status = models.CharField(
        max_length=20, choices=ASSIGNMENT_STATUS_CHOICES, default="unassigned"
    )
    tracking_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    delivery_otp_code = models.CharField(max_length=6, null=True, blank=True)
    delivery_otp_generated_at = models.DateTimeField(null=True, blank=True)
    delivery_otp_verified_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    delivery_accepted_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-order_date"]

    def __str__(self):
        return f"Order #{self.id} - {self.user.username}"


class DeliveryNotification(models.Model):
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="delivery_notifications"
    )
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="delivery_notifications"
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["recipient", "is_read"], name="api_delnot_recip_read_idx"
            ),
            models.Index(fields=["created_at"], name="api_delnot_created_idx"),
        ]

    def __str__(self):
        return f"Notification #{self.id} for {self.recipient.username}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

    @property
    def total_price(self):
        return self.price * self.quantity


class Review(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("product", "user")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.product.name} ({self.rating}★)"


class ProductQuestion(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="questions"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="asked_product_questions",
    )
    question = models.TextField()
    answer = models.TextField(blank=True)
    answered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="answered_product_questions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Question #{self.id} on {self.product.name}"


class Payment(models.Model):
    PAYMENT_STATUS = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="payment"
    )
    payment_method = models.CharField(max_length=50)
    transaction_id = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default="pending")
    paid_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment #{self.id} for Order #{self.order.id}"


class RewardScratchCard(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="scratch_cards"
    )
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="scratch_card"
    )
    title = models.CharField(max_length=120, default="Post-Purchase Scratch Card")
    reward_points = models.PositiveIntegerField(default=0)
    is_revealed = models.BooleanField(default=False)
    revealed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ScratchCard #{self.id} - Order #{self.order.id}"


class JobApplication(models.Model):
    ROLE_CHOICES = [
        ("delivery_partner", "Delivery Partner"),
        ("merchant_partner", "Merchant Partner"),
        ("warehouse_associate", "Warehouse Associate"),
        ("customer_support", "Customer Support Executive"),
        ("sales_executive", "Sales Executive"),
        ("frontend_developer", "Frontend Developer"),
        ("backend_developer", "Backend Developer"),
        ("uiux_designer", "UI/UX Designer"),
        ("qa_engineer", "QA Engineer"),
        ("digital_marketing", "Digital Marketing Specialist"),
        ("operations_manager", "Operations Manager"),
    ]

    STATUS_CHOICES = [
        ("new", "New"),
        ("reviewed", "Reviewed"),
        ("shortlisted", "Shortlisted"),
        ("interview", "Interview Scheduled"),
        ("rejected", "Rejected"),
        ("hired", "Hired"),
    ]

    applicant_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="job_applications",
    )
    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=15)
    city = models.CharField(max_length=100, blank=True)
    role_applied = models.CharField(max_length=50, choices=ROLE_CHOICES)
    experience_years = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(50)],
    )
    resume_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    business_name = models.CharField(max_length=255, blank=True)
    selected_subscription_plan = models.ForeignKey(
        MerchantSubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="job_applications",
    )
    selected_billing_cycle = models.CharField(
        max_length=20,
        choices=MerchantSubscriptionPlan.BILLING_CYCLE_CHOICES,
        blank=True,
    )
    selected_subscription_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} - {self.get_role_applied_display()}"
