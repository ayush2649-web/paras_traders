from django.contrib import admin
from .models import (
    UserProfile, MerchantSubscriptionPlan, MerchantSubscription, Category, Product, Cart,
    Wishlist, Order, OrderItem, Review, ProductQuestion, Payment, JobApplication
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'city', 'is_seller']
    search_fields = ['user__username', 'phone']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(MerchantSubscriptionPlan)
class MerchantSubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'monthly_price', 'yearly_price', 'product_limit',
        'commission_rate', 'is_recommended', 'is_active'
    ]
    list_filter = ['is_active', 'is_recommended', 'priority_support', 'featured_placement']
    search_fields = ['name', 'code']
    list_editable = ['monthly_price', 'yearly_price', 'is_recommended', 'is_active']


@admin.register(MerchantSubscription)
class MerchantSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'merchant', 'plan', 'billing_cycle', 'status', 'amount',
        'starts_at', 'ends_at', 'auto_renew'
    ]
    list_filter = ['status', 'billing_cycle', 'auto_renew', 'plan']
    search_fields = ['merchant__username', 'merchant__email', 'plan__name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock', 'is_featured', 'is_active']
    list_filter = ['category', 'is_featured', 'is_active']
    search_fields = ['name', 'brand']
    list_editable = ['price', 'stock', 'is_featured', 'is_active']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'quantity', 'added_at']


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'added_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'total_amount', 'status', 'assignment_status',
        'assigned_delivery_partner', 'tracking_code', 'order_date'
    ]
    list_filter = ['status', 'assignment_status']
    search_fields = ['user__username', 'shipping_name', 'tracking_code']
    list_editable = ['status', 'assignment_status', 'assigned_delivery_partner']


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'created_at']
    list_filter = ['rating']


@admin.register(ProductQuestion)
class ProductQuestionAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'answered_by', 'created_at', 'answered_at']
    search_fields = ['product__name', 'question', 'answer', 'user__username']
    list_filter = ['created_at', 'answered_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['order', 'payment_method', 'amount', 'status', 'paid_at']
    list_filter = ['status', 'payment_method']


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'email', 'role_applied', 'selected_subscription_plan',
        'selected_billing_cycle', 'status', 'created_at'
    ]
    list_filter = ['role_applied', 'status', 'created_at']
    search_fields = ['full_name', 'email', 'phone', 'city']
    list_editable = ['status']
