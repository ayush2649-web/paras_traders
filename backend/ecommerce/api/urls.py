from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views


router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'cart', views.CartViewSet, basename='cart')
router.register(r'wishlist', views.WishlistViewSet, basename='wishlist')
router.register(r'orders', views.OrderViewSet, basename='orders')
router.register(r'admin/products', views.AdminProductViewSet, basename='admin-products')
router.register(r'merchant/products', views.MerchantProductViewSet, basename='merchant-products')
router.register(r'merchant/orders', views.MerchantOrderViewSet, basename='merchant-orders')

urlpatterns = [


    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),
    path('auth/delete/', views.DeleteUserView.as_view(), name='delete-user'),

    # Orders
    path('orders/create/', views.CreateOrderView.as_view(), name='create-order'),
    path('orders/track/<str:tracking_code>/', views.OrderTrackingByCodeView.as_view(), name='track-order'),

    # Rewards
    path('rewards/status/', views.RewardsStatusView.as_view(), name='rewards-status'),
    path('rewards/daily-login/', views.DailyLoginRewardView.as_view(), name='daily-login-reward'),
    path('rewards/scratch-cards/', views.ScratchCardListView.as_view(), name='scratch-cards'),
    path('rewards/scratch-cards/<int:pk>/reveal/', views.ScratchCardRevealView.as_view(), name='scratch-card-reveal'),

    # Reviews
    path('products/<int:product_id>/reviews/', views.ProductReviewsView.as_view(), name='product-reviews'),
    path('products/<int:product_id>/questions/', views.ProductQuestionsView.as_view(), name='product-questions'),

    # Merchant subscriptions
    path('merchant/subscription/plans/', views.MerchantSubscriptionPlanListView.as_view(), name='merchant-subscription-plans'),
    path('merchant/subscription/', views.MerchantSubscriptionView.as_view(), name='merchant-subscription'),

    # Careers / Jobs
    path('jobs/roles/', views.JobRoleListView.as_view(), name='job-roles'),
    path('jobs/apply/', views.JobApplicationCreateView.as_view(), name='job-apply'),

    # Admin
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/delivery-partners/', views.AdminDeliveryPartnerListView.as_view(), name='admin-delivery-partners'),
    path('admin/orders/', views.AdminOrdersView.as_view(), name='admin-orders'),
    path('admin/orders/<int:pk>/assign-delivery/', views.AdminAssignDeliveryPartnerView.as_view(), name='admin-assign-delivery'),
    path('admin/orders/<int:pk>/status/', views.AdminOrderUpdateView.as_view(), name='admin-order-update'),
    path('admin/payments/<int:pk>/status/', views.AdminPaymentUpdateView.as_view(), name='admin-payment-update'),
    path('super-admin/overview/', views.SuperAdminOverviewView.as_view(), name='super-admin-overview'),
    path('super-admin/users/', views.AdminUserListView.as_view(), name='super-admin-users'),
    path('super-admin/users/<int:pk>/role/', views.AdminUserRoleUpdateView.as_view(), name='super-admin-user-role'),
    path('super-admin/users/<int:pk>/', views.AdminUserDeleteView.as_view(), name='super-admin-user-delete'),
    path('super-admin/job-applications/', views.SuperAdminJobApplicationListView.as_view(), name='super-admin-job-applications'),
    path('super-admin/job-applications/<int:pk>/decision/', views.SuperAdminJobApplicationDecisionView.as_view(), name='super-admin-job-application-decision'),
    path('admin/job-applications/', views.AdminJobApplicationListView.as_view(), name='admin-job-applications'),
    path('admin/job-applications/<int:pk>/status/', views.AdminJobApplicationStatusUpdateView.as_view(), name='admin-job-application-status'),

    # Merchant
    path('merchant/applications/', views.MerchantJobApplicationListView.as_view(), name='merchant-applications'),
    path('merchant/applications/<int:pk>/decision/', views.MerchantJobApplicationDecisionView.as_view(), name='merchant-application-decision'),
    path('merchant/questions/', views.MerchantProductQuestionListView.as_view(), name='merchant-product-questions'),
    path('merchant/questions/<int:pk>/answer/', views.MerchantProductQuestionAnswerView.as_view(), name='merchant-product-question-answer'),
    path('merchant/analytics/', views.MerchantAnalyticsView.as_view(), name='merchant-analytics'),
    path('merchant/settings/', views.MerchantSettingsView.as_view(), name='merchant-settings'),

    # Delivery Partner
    path('delivery/notifications/', views.DeliveryNotificationListView.as_view(), name='delivery-notifications'),
    path('delivery/notifications/<int:pk>/read/', views.DeliveryNotificationReadView.as_view(), name='delivery-notification-read'),
    path('delivery/notifications/read-all/', views.DeliveryNotificationReadAllView.as_view(), name='delivery-notification-read-all'),
    path('delivery/orders/', views.DeliveryOrdersView.as_view(), name='delivery-orders'),
    path('delivery/orders/<int:pk>/accept/', views.DeliveryOrderAcceptView.as_view(), name='delivery-order-accept'),
    path('delivery/orders/<int:pk>/status/', views.DeliveryOrderStatusUpdateView.as_view(), name='delivery-order-status'),

    path('', include(router.urls)),
]
