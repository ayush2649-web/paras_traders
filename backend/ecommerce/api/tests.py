from decimal import Decimal
from datetime import timedelta
import uuid

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Cart, Category, DeliveryNotification, JobApplication, MerchantSubscription,
    MerchantSubscriptionPlan, Order, OrderItem, Payment, Product, ProductQuestion,
    RewardScratchCard, UserProfile
)


class AuthAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='buyer12345'
        )
        UserProfile.objects.create(user=self.user)

    def test_login_accepts_username(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'buyer',
            'password': 'buyer12345',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'buyer')
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])

    def test_login_accepts_email_case_insensitive(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'BUYER@example.com',
            'password': 'buyer12345',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], 'buyer@example.com')

    def test_login_rejects_invalid_credentials(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'buyer@example.com',
            'password': 'wrong-password',
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error'], 'Invalid username or password')


class OrderCancellationAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='buyer12345'
        )
        self.other_user = User.objects.create_user(
            username='otherbuyer',
            email='otherbuyer@example.com',
            password='other12345'
        )
        self.category = Category.objects.create(name='Electronics')
        self.product = Product.objects.create(
            name='Noise Cancelling Headphones',
            description='Great sound quality',
            price=Decimal('2500.00'),
            category=self.category,
            stock=5,
            is_active=True
        )

    def _create_order(self, *, user, order_status='pending', quantity=2, payment_method='UPI', payment_status='completed'):
        order = Order.objects.create(
            user=user,
            total_amount=Decimal('5000.00'),
            status=order_status,
            shipping_name='Test User',
            shipping_address='123 Demo Street',
            shipping_city='Pune',
            shipping_state='Maharashtra',
            shipping_pincode='411001',
            shipping_phone='9999999999',
            payment_method=payment_method,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=quantity,
            price=self.product.price
        )
        Payment.objects.create(
            order=order,
            payment_method=payment_method,
            transaction_id='TXN-DEMO',
            amount=order.total_amount,
            status=payment_status
        )
        return order

    def test_user_can_cancel_pending_order_and_stock_is_restored(self):
        order = self._create_order(user=self.user, order_status='pending', quantity=2)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.product.refresh_from_db()
        order.payment.refresh_from_db()

        self.assertEqual(order.status, 'cancelled')
        self.assertEqual(self.product.stock, 7)
        self.assertEqual(order.payment.status, 'refunded')

    def test_cannot_cancel_shipped_order(self):
        order = self._create_order(user=self.user, order_status='shipped', quantity=1)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.product.refresh_from_db()
        order.payment.refresh_from_db()

        self.assertEqual(order.status, 'shipped')
        self.assertEqual(self.product.stock, 5)
        self.assertEqual(order.payment.status, 'completed')

    def test_user_cannot_cancel_another_users_order(self):
        order = self._create_order(user=self.other_user, order_status='pending', quantity=1)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/orders/{order.id}/cancel/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_user_cannot_cancel_order(self):
        order = self._create_order(user=self.user, order_status='pending', quantity=1)

        response = self.client.post(f'/api/orders/{order.id}/cancel/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SimilarProductsAPITests(APITestCase):
    def setUp(self):
        self.electronics = Category.objects.create(name='Electronics')
        self.books = Category.objects.create(name='Books')

        self.target_product = Product.objects.create(
            name='Target Phone',
            description='Flagship device',
            price=Decimal('69999.00'),
            category=self.electronics,
            brand='Acme',
            stock=10,
            is_active=True
        )
        self.same_brand_1 = Product.objects.create(
            name='Acme Phone Lite',
            description='Budget variant',
            price=Decimal('29999.00'),
            category=self.electronics,
            brand='Acme',
            stock=10,
            is_active=True
        )
        self.same_brand_2 = Product.objects.create(
            name='Acme Phone Pro',
            description='Premium variant',
            price=Decimal('89999.00'),
            category=self.electronics,
            brand='Acme',
            stock=10,
            is_active=True
        )
        self.same_category_other_brand = Product.objects.create(
            name='Other Brand Phone',
            description='Another option',
            price=Decimal('49999.00'),
            category=self.electronics,
            brand='Other',
            stock=10,
            is_active=True
        )
        self.inactive_same_category = Product.objects.create(
            name='Inactive Acme Phone',
            description='Not for sale',
            price=Decimal('59999.00'),
            category=self.electronics,
            brand='Acme',
            stock=10,
            is_active=False
        )
        self.other_category = Product.objects.create(
            name='Acme Book',
            description='Different category',
            price=Decimal('499.00'),
            category=self.books,
            brand='Acme',
            stock=10,
            is_active=True
        )

    def test_similar_products_returns_active_items_in_same_category(self):
        response = self.client.get(f'/api/products/{self.target_product.id}/similar/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item['id'] for item in response.data]

        self.assertIn(self.same_brand_1.id, ids)
        self.assertIn(self.same_brand_2.id, ids)
        self.assertIn(self.same_category_other_brand.id, ids)
        self.assertNotIn(self.target_product.id, ids)
        self.assertNotIn(self.inactive_same_category.id, ids)
        self.assertNotIn(self.other_category.id, ids)

        # Same-brand products are returned first when available.
        self.assertIn(response.data[0]['id'], [self.same_brand_1.id, self.same_brand_2.id])


class DeliveryPartnerAPITests(APITestCase):
    def setUp(self):
        self.delivery_user = User.objects.create_user(
            username='delivery1',
            email='delivery1@example.com',
            password='delivery123'
        )
        self.delivery_profile = UserProfile.objects.create(user=self.delivery_user, is_seller=True)
        self.other_delivery_user = User.objects.create_user(
            username='delivery2',
            email='delivery2@example.com',
            password='delivery123'
        )
        UserProfile.objects.create(user=self.other_delivery_user, is_seller=True)
        self.admin_user = User.objects.create_user(
            username='deliveryadmin',
            email='deliveryadmin@example.com',
            password='admin12345',
            is_staff=True
        )
        UserProfile.objects.create(user=self.admin_user)

        self.regular_user = User.objects.create_user(
            username='customer1',
            email='customer1@example.com',
            password='customer123'
        )
        UserProfile.objects.create(user=self.regular_user, is_seller=False)

        self.order_owner = User.objects.create_user(
            username='buyer1',
            email='buyer1@example.com',
            password='buyer12345'
        )
        UserProfile.objects.create(user=self.order_owner)

        self.category = Category.objects.create(name='Appliances')
        self.product = Product.objects.create(
            name='Mixer Grinder',
            description='Kitchen appliance',
            price=Decimal('2499.00'),
            category=self.category,
            stock=10,
            is_active=True
        )

        self.confirmed_order = self._create_order(
            order_status='confirmed',
            assigned_delivery_partner=self.delivery_user,
            assignment_status='pending'
        )
        self.shipped_order = self._create_order(
            order_status='shipped',
            assigned_delivery_partner=self.delivery_user,
            assignment_status='accepted',
            with_tracking=True
        )
        self.pending_order = self._create_order(order_status='pending')
        self.other_partner_order = self._create_order(
            order_status='confirmed',
            assigned_delivery_partner=self.other_delivery_user,
            assignment_status='pending'
        )

        self.notification = DeliveryNotification.objects.create(
            recipient=self.delivery_user,
            order=self.confirmed_order,
            title='New Order',
            message='New order is ready for delivery queue.'
        )
        self.other_partner_notification = DeliveryNotification.objects.create(
            recipient=self.other_delivery_user,
            order=self.other_partner_order,
            title='Other Partner Order',
            message='Other partner notification'
        )

    def _create_order(self, order_status, assigned_delivery_partner=None, assignment_status='unassigned', with_tracking=False):
        now = timezone.now()
        otp_code = '654321' if order_status in ['shipped'] else None
        order = Order.objects.create(
            user=self.order_owner,
            total_amount=Decimal('2499.00'),
            status=order_status,
            shipping_name='Buyer One',
            shipping_address='221B Baker Street',
            shipping_city='Mumbai',
            shipping_state='Maharashtra',
            shipping_pincode='400001',
            shipping_phone='9876543210',
            payment_method='COD',
            assigned_delivery_partner=assigned_delivery_partner,
            assignment_status=assignment_status,
            assigned_at=now if assigned_delivery_partner else None,
            delivery_accepted_at=now if assignment_status == 'accepted' else None,
            tracking_code=f'PT-TEST{uuid.uuid4().hex[:8].upper()}' if with_tracking else None,
            delivery_otp_code=otp_code,
            delivery_otp_generated_at=now if otp_code else None,
            delivery_otp_verified_at=now if order_status == 'delivered' else None,
            confirmed_at=now if order_status in ['confirmed', 'shipped', 'delivered'] else None,
            shipped_at=now if order_status in ['shipped', 'delivered'] else None,
            delivered_at=now if order_status == 'delivered' else None,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1,
            price=self.product.price
        )
        Payment.objects.create(
            order=order,
            payment_method='COD',
            transaction_id='TXN-DELIVERY',
            amount=order.total_amount,
            status='pending'
        )
        return order

    def test_delivery_partner_can_list_delivery_orders(self):
        self.client.force_authenticate(user=self.delivery_user)
        response = self.client.get('/api/delivery/orders/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [item['id'] for item in response.data]
        self.assertIn(self.confirmed_order.id, order_ids)
        self.assertIn(self.shipped_order.id, order_ids)
        self.assertNotIn(self.pending_order.id, order_ids)
        self.assertNotIn(self.other_partner_order.id, order_ids)

    def test_delivery_partner_can_filter_by_delivery_slot(self):
        self.confirmed_order.delivery_slot = 'morning'
        self.confirmed_order.save(update_fields=['delivery_slot'])
        self.shipped_order.delivery_slot = 'evening'
        self.shipped_order.save(update_fields=['delivery_slot'])

        self.client.force_authenticate(user=self.delivery_user)
        response = self.client.get('/api/delivery/orders/?delivery_slot=morning')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [item['id'] for item in response.data]
        self.assertIn(self.confirmed_order.id, order_ids)
        self.assertNotIn(self.shipped_order.id, order_ids)
        self.assertNotIn(self.other_partner_order.id, order_ids)

    def test_regular_user_cannot_access_delivery_orders(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/delivery/orders/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_admin_can_access_delivery_orders_as_all(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/delivery/orders/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order_ids = [item['id'] for item in response.data]
        self.assertIn(self.confirmed_order.id, order_ids)
        self.assertIn(self.shipped_order.id, order_ids)
        self.assertIn(self.other_partner_order.id, order_ids)
        self.assertNotIn(self.pending_order.id, order_ids)

    def test_delivery_partner_can_accept_order_and_receive_tracking_code(self):
        self.client.force_authenticate(user=self.delivery_user)
        response = self.client.patch(
            f'/api/delivery/orders/{self.confirmed_order.id}/accept/',
            {},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.confirmed_order.refresh_from_db()
        self.assertEqual(self.confirmed_order.assignment_status, 'accepted')
        self.assertIsNotNone(self.confirmed_order.delivery_accepted_at)
        self.assertTrue(self.confirmed_order.tracking_code)

    def test_delivery_partner_must_accept_before_status_update(self):
        self.client.force_authenticate(user=self.delivery_user)
        response = self.client.patch(
            f'/api/delivery/orders/{self.confirmed_order.id}/status/',
            {'status': 'shipped'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.confirmed_order.refresh_from_db()
        self.assertEqual(self.confirmed_order.status, 'confirmed')

    def test_delivery_partner_can_update_order_status_in_sequence(self):
        self.client.force_authenticate(user=self.delivery_user)
        accept_response = self.client.patch(
            f'/api/delivery/orders/{self.confirmed_order.id}/accept/',
            {},
            format='json'
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            f'/api/delivery/orders/{self.confirmed_order.id}/status/',
            {'status': 'shipped'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.confirmed_order.refresh_from_db()
        self.assertEqual(self.confirmed_order.status, 'shipped')
        self.assertIsNotNone(self.confirmed_order.shipped_at)
        self.assertTrue(self.confirmed_order.delivery_otp_code)
        self.assertIsNotNone(self.confirmed_order.delivery_otp_generated_at)

    def test_delivery_partner_cannot_skip_status_transition(self):
        self.client.force_authenticate(user=self.delivery_user)
        accept_response = self.client.patch(
            f'/api/delivery/orders/{self.confirmed_order.id}/accept/',
            {},
            format='json'
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            f'/api/delivery/orders/{self.confirmed_order.id}/status/',
            {'status': 'delivered'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.confirmed_order.refresh_from_db()
        self.assertEqual(self.confirmed_order.status, 'confirmed')

    def test_mark_delivered_requires_valid_delivery_otp(self):
        self.client.force_authenticate(user=self.delivery_user)

        missing_otp_response = self.client.patch(
            f'/api/delivery/orders/{self.shipped_order.id}/status/',
            {'status': 'delivered'},
            format='json'
        )
        self.assertEqual(missing_otp_response.status_code, status.HTTP_400_BAD_REQUEST)

        wrong_otp_response = self.client.patch(
            f'/api/delivery/orders/{self.shipped_order.id}/status/',
            {'status': 'delivered', 'delivery_otp': '111111'},
            format='json'
        )
        self.assertEqual(wrong_otp_response.status_code, status.HTTP_400_BAD_REQUEST)

        correct_otp_response = self.client.patch(
            f'/api/delivery/orders/{self.shipped_order.id}/status/',
            {'status': 'delivered', 'delivery_otp': '654321'},
            format='json'
        )
        self.assertEqual(correct_otp_response.status_code, status.HTTP_200_OK)

        self.shipped_order.refresh_from_db()
        self.assertEqual(self.shipped_order.status, 'delivered')
        self.assertIsNotNone(self.shipped_order.delivered_at)
        self.assertIsNotNone(self.shipped_order.delivery_otp_verified_at)
        self.assertIsNone(self.shipped_order.delivery_otp_code)

    def test_delivery_partner_can_list_only_own_notifications(self):
        self.client.force_authenticate(user=self.delivery_user)
        response = self.client.get('/api/delivery/notifications/?limit=10')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('unread_count', response.data)

        notification_ids = [item['id'] for item in response.data['results']]
        self.assertIn(self.notification.id, notification_ids)
        self.assertNotIn(self.other_partner_notification.id, notification_ids)
        self.assertGreaterEqual(response.data['unread_count'], 1)

    def test_delivery_partner_can_mark_notification_as_read(self):
        self.client.force_authenticate(user=self.delivery_user)
        response = self.client.patch(
            f'/api/delivery/notifications/{self.notification.id}/read/',
            {},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_delivery_partner_can_mark_all_notifications_as_read(self):
        DeliveryNotification.objects.create(
            recipient=self.delivery_user,
            order=self.shipped_order,
            title='Another Notification',
            message='Read all test notification'
        )

        self.client.force_authenticate(user=self.delivery_user)
        response = self.client.post('/api/delivery/notifications/read-all/', {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unread_count = DeliveryNotification.objects.filter(recipient=self.delivery_user, is_read=False).count()
        self.assertEqual(unread_count, 0)

    def test_regular_user_cannot_access_delivery_notifications(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/delivery/notifications/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class OrderAssignmentAndTrackingAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='opsadmin',
            email='opsadmin@example.com',
            password='admin12345',
            is_staff=True
        )
        self.delivery_user = User.objects.create_user(
            username='partner1',
            email='partner1@example.com',
            password='partner12345'
        )
        UserProfile.objects.create(user=self.delivery_user, is_seller=True)

        self.customer_user = User.objects.create_user(
            username='customertracking',
            email='customertracking@example.com',
            password='customer12345'
        )
        UserProfile.objects.create(user=self.customer_user)

        self.category = Category.objects.create(name='Grocery')
        self.product = Product.objects.create(
            name='Rice Bag',
            description='5kg package',
            price=Decimal('599.00'),
            category=self.category,
            stock=12,
            is_active=True
        )

        self.order = Order.objects.create(
            user=self.customer_user,
            total_amount=Decimal('599.00'),
            status='pending',
            shipping_name='Tracking Customer',
            shipping_address='42 Trace Road',
            shipping_city='Jaipur',
            shipping_state='Rajasthan',
            shipping_pincode='302001',
            shipping_phone='9898989898',
            payment_method='COD',
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=1,
            price=self.product.price
        )
        Payment.objects.create(
            order=self.order,
            payment_method='COD',
            transaction_id='TXN-ASSIGN',
            amount=self.order.total_amount,
            status='pending'
        )

    def _assign_accept_and_ship_order(self):
        self.client.force_authenticate(user=self.admin_user)
        assign_response = self.client.patch(
            f'/api/admin/orders/{self.order.id}/assign-delivery/',
            {'delivery_partner_id': self.delivery_user.id},
            format='json'
        )
        self.assertEqual(assign_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.delivery_user)
        accept_response = self.client.patch(
            f'/api/delivery/orders/{self.order.id}/accept/',
            {},
            format='json'
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        ship_response = self.client.patch(
            f'/api/delivery/orders/{self.order.id}/status/',
            {'status': 'shipped'},
            format='json'
        )
        self.assertEqual(ship_response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertTrue(self.order.tracking_code)
        self.assertEqual(self.order.status, 'shipped')
        self.assertTrue(self.order.delivery_otp_code)

    def test_admin_can_assign_delivery_partner(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f'/api/admin/orders/{self.order.id}/assign-delivery/',
            {'delivery_partner_id': self.delivery_user.id},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'confirmed')
        self.assertEqual(self.order.assigned_delivery_partner_id, self.delivery_user.id)
        self.assertEqual(self.order.assignment_status, 'pending')
        self.assertIsNotNone(self.order.assigned_at)
        self.assertIsNotNone(self.order.confirmed_at)

    def test_accepting_assigned_order_generates_tracking_code_and_tracking_api_works(self):
        self.client.force_authenticate(user=self.admin_user)
        assign_response = self.client.patch(
            f'/api/admin/orders/{self.order.id}/assign-delivery/',
            {'delivery_partner_id': self.delivery_user.id},
            format='json'
        )
        self.assertEqual(assign_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.delivery_user)
        accept_response = self.client.patch(
            f'/api/delivery/orders/{self.order.id}/accept/',
            {},
            format='json'
        )
        self.assertEqual(accept_response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertTrue(self.order.tracking_code)
        self.assertEqual(self.order.assignment_status, 'accepted')
        self.assertIsNotNone(self.order.delivery_accepted_at)

        self.client.force_authenticate(user=None)
        track_response = self.client.get(f'/api/orders/track/{self.order.tracking_code}/')
        self.assertEqual(track_response.status_code, status.HTTP_200_OK)
        self.assertEqual(track_response.data['order_id'], self.order.id)
        self.assertEqual(track_response.data['tracking_code'], self.order.tracking_code)
        self.assertGreaterEqual(len(track_response.data['timeline']), 1)

    def test_non_admin_cannot_assign_delivery_partner(self):
        self.client.force_authenticate(user=self.customer_user)
        response = self.client.patch(
            f'/api/admin/orders/{self.order.id}/assign-delivery/',
            {'delivery_partner_id': self.delivery_user.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tracking_shows_customer_delivery_otp_to_order_owner(self):
        self._assign_accept_and_ship_order()

        self.client.force_authenticate(user=self.customer_user)
        track_response = self.client.get(f'/api/orders/track/{self.order.tracking_code}/')

        self.assertEqual(track_response.status_code, status.HTTP_200_OK)
        self.assertEqual(track_response.data['customer_delivery_otp'], self.order.delivery_otp_code)
        self.assertTrue(track_response.data['delivery_otp_required'])

    def test_tracking_hides_customer_delivery_otp_for_anonymous_user(self):
        self._assign_accept_and_ship_order()

        self.client.force_authenticate(user=None)
        track_response = self.client.get(f'/api/orders/track/{self.order.tracking_code}/')

        self.assertEqual(track_response.status_code, status.HTTP_200_OK)
        self.assertIn('customer_delivery_otp', track_response.data)
        self.assertIsNone(track_response.data['customer_delivery_otp'])


class OrderCheckoutDeliveryPreferencesTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='checkoutuser',
            email='checkout@example.com',
            password='checkout123'
        )
        UserProfile.objects.create(user=self.user)

        self.delivery_user_one = User.objects.create_user(
            username='checkoutdp1',
            email='checkoutdp1@example.com',
            password='delivery123'
        )
        UserProfile.objects.create(user=self.delivery_user_one, is_seller=True)

        self.delivery_user_two = User.objects.create_user(
            username='checkoutdp2',
            email='checkoutdp2@example.com',
            password='delivery123'
        )
        UserProfile.objects.create(user=self.delivery_user_two, is_seller=True)

        self.category = Category.objects.create(name='Daily Essentials')
        self.product = Product.objects.create(
            name='Skincare Serum',
            description='Hydrating face serum',
            price=Decimal('799.00'),
            category=self.category,
            stock=8,
            is_active=True
        )

    def _add_cart_item(self, quantity=2):
        Cart.objects.create(user=self.user, product=self.product, quantity=quantity)

    def _checkout_payload(self, **overrides):
        payload = {
            'shipping_name': 'Checkout User',
            'shipping_address': '221 Green Street',
            'shipping_city': 'Bengaluru',
            'shipping_state': 'Karnataka',
            'shipping_pincode': '560001',
            'shipping_phone': '9999999999',
            'delivery_date': str(timezone.localdate() + timedelta(days=1)),
            'delivery_slot': 'evening',
            'eco_delivery': True,
            'payment_method': 'COD',
            'save_address': False,
        }
        payload.update(overrides)
        return payload

    def test_checkout_saves_delivery_slot_date_and_eco_preference(self):
        self._add_cart_item()
        self.client.force_authenticate(user=self.user)
        payload = self._checkout_payload()
        response = self.client.post('/api/orders/create/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(str(order.delivery_date), payload['delivery_date'])
        self.assertEqual(order.delivery_slot, 'evening')
        self.assertTrue(order.eco_delivery)

    def test_checkout_rejects_past_delivery_date(self):
        self._add_cart_item()
        self.client.force_authenticate(user=self.user)
        past_date = timezone.localdate() - timedelta(days=1)
        response = self.client.post(
            '/api/orders/create/',
            self._checkout_payload(delivery_date=str(past_date)),
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('delivery_date', response.data)

    def test_checkout_notifies_all_delivery_partners(self):
        self._add_cart_item()
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/create/', self._checkout_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_id = response.data['id']

        notifications = DeliveryNotification.objects.filter(order_id=order_id)
        self.assertEqual(notifications.count(), 2)

        recipients = set(notifications.values_list('recipient__username', flat=True))
        self.assertEqual(recipients, {'checkoutdp1', 'checkoutdp2'})

        unread_count = notifications.filter(is_read=False).count()
        self.assertEqual(unread_count, 2)


class RewardsAndGamificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='rewarduser',
            email='reward@example.com',
            password='reward123'
        )
        UserProfile.objects.create(user=self.user)

        self.category = Category.objects.create(name='Wellness')
        self.product = Product.objects.create(
            name='Vitamin C',
            description='Daily supplement',
            price=Decimal('499.00'),
            category=self.category,
            stock=15,
            is_active=True
        )

    def _order_payload(self):
        return {
            'shipping_name': 'Reward User',
            'shipping_address': '42 Example Road',
            'shipping_city': 'Delhi',
            'shipping_state': 'Delhi',
            'shipping_pincode': '110001',
            'shipping_phone': '9000000000',
            'delivery_date': str(timezone.localdate() + timedelta(days=1)),
            'delivery_slot': 'morning',
            'eco_delivery': False,
            'payment_method': 'COD',
            'save_address': False,
        }

    def test_daily_login_reward_can_be_claimed_once_per_day(self):
        self.client.force_authenticate(user=self.user)

        first = self.client.post('/api/rewards/daily-login/')
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertIn('claimed_points', first.data)
        self.assertGreater(first.data['claimed_points'], 0)

        second = self.client.post('/api/rewards/daily-login/')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rewards_status_returns_level_and_pending_cards(self):
        profile = self.user.profile
        profile.reward_points = 350
        profile.save(update_fields=['reward_points'])

        order = Order.objects.create(
            user=self.user,
            total_amount=Decimal('499.00'),
            status='confirmed',
            shipping_name='Reward User',
            shipping_address='42 Example Road',
            shipping_city='Delhi',
            shipping_state='Delhi',
            shipping_pincode='110001',
            shipping_phone='9000000000',
            payment_method='COD',
        )
        RewardScratchCard.objects.create(user=self.user, order=order, title='Scratch & Win')

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/rewards/status/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['reward_level'], 'Silver')
        self.assertEqual(response.data['pending_scratch_cards'], 1)

    def test_order_creation_generates_scratch_card_and_reveal_adds_points(self):
        Cart.objects.create(user=self.user, product=self.product, quantity=2)
        self.client.force_authenticate(user=self.user)

        order_response = self.client.post('/api/orders/create/', self._order_payload(), format='json')
        self.assertEqual(order_response.status_code, status.HTTP_201_CREATED)
        order_id = order_response.data['id']

        card = RewardScratchCard.objects.get(order_id=order_id, user=self.user)
        self.assertFalse(card.is_revealed)

        list_response = self.client.get('/api/rewards/scratch-cards/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]['id'], card.id)
        self.assertIsNone(list_response.data[0]['reward_points'])

        reveal = self.client.post(f'/api/rewards/scratch-cards/{card.id}/reveal/')
        self.assertEqual(reveal.status_code, status.HTTP_200_OK)
        claimed = reveal.data['claimed_points']

        card.refresh_from_db()
        self.user.profile.refresh_from_db()
        self.assertTrue(card.is_revealed)
        self.assertEqual(card.reward_points, claimed)
        self.assertEqual(self.user.profile.reward_points, claimed)

        reveal_again = self.client.post(f'/api/rewards/scratch-cards/{card.id}/reveal/')
        self.assertEqual(reveal_again.status_code, status.HTTP_400_BAD_REQUEST)


class ProductQuestionAPITests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='questionbuyer',
            email='questionbuyer@example.com',
            password='buyer12345'
        )
        UserProfile.objects.create(user=self.customer)
        self.other_customer = User.objects.create_user(
            username='otherquestionbuyer',
            email='otherquestionbuyer@example.com',
            password='buyer12345'
        )
        UserProfile.objects.create(user=self.other_customer)
        self.merchant_user = User.objects.create_user(
            username='merchantowner',
            email='merchantowner@example.com',
            password='merchant12345',
            is_staff=True
        )
        UserProfile.objects.create(
            user=self.merchant_user,
            employee_role='merchant_partner',
            is_seller=True,
        )
        self.other_merchant = User.objects.create_user(
            username='othermerchantowner',
            email='othermerchantowner@example.com',
            password='merchant12345',
            is_staff=True
        )
        UserProfile.objects.create(
            user=self.other_merchant,
            employee_role='merchant_partner',
            is_seller=True,
        )
        self.category = Category.objects.create(name='Question Category')
        self.product = Product.objects.create(
            seller=self.merchant_user,
            name='Q and A Phone',
            description='Phone with merchant questions enabled.',
            price=Decimal('15999.00'),
            category=self.category,
            stock=7,
            is_active=True,
        )
        self.answered_question = ProductQuestion.objects.create(
            product=self.product,
            user=self.customer,
            question='Does this support dual SIM?',
            answer='Yes, it supports dual nano SIM cards.',
            answered_by=self.merchant_user,
            answered_at=timezone.now(),
        )
        self.pending_question = ProductQuestion.objects.create(
            product=self.product,
            user=self.other_customer,
            question='Is a charger included in the box?',
        )

    def test_public_list_shows_only_answered_product_questions(self):
        response = self.client.get(f'/api/products/{self.product.id}/questions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], self.answered_question.id)

    def test_authenticated_customer_can_submit_question_and_view_pending_question(self):
        self.client.force_authenticate(user=self.customer)
        create_response = self.client.post(
            f'/api/products/{self.product.id}/questions/',
            {'question': 'What is the warranty period?'},
            format='json'
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        created_id = create_response.data['id']
        created_question = ProductQuestion.objects.get(id=created_id)
        self.assertEqual(created_question.user, self.customer)
        self.assertEqual(created_question.product, self.product)
        self.assertEqual(created_question.answer, '')

        list_response = self.client.get(f'/api/products/{self.product.id}/questions/')
        returned_ids = {item['id'] for item in list_response.data}
        self.assertIn(self.answered_question.id, returned_ids)
        self.assertIn(created_id, returned_ids)

    def test_merchant_can_list_and_answer_own_product_questions(self):
        self.client.force_authenticate(user=self.merchant_user)

        list_response = self.client.get('/api/merchant/questions/?status=pending')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        returned_ids = {item['id'] for item in list_response.data['results']}
        self.assertIn(self.pending_question.id, returned_ids)
        self.assertNotIn(self.answered_question.id, returned_ids)

        answer_response = self.client.post(
            f'/api/merchant/questions/{self.pending_question.id}/answer/',
            {'answer': 'Yes, a fast charger is included.'},
            format='json'
        )
        self.assertEqual(answer_response.status_code, status.HTTP_200_OK)
        self.pending_question.refresh_from_db()
        self.assertEqual(self.pending_question.answer, 'Yes, a fast charger is included.')
        self.assertEqual(self.pending_question.answered_by, self.merchant_user)
        self.assertIsNotNone(self.pending_question.answered_at)

    def test_other_merchant_cannot_answer_unowned_product_question(self):
        self.client.force_authenticate(user=self.other_merchant)
        response = self.client.post(
            f'/api/merchant/questions/{self.pending_question.id}/answer/',
            {'answer': 'Unauthorized reply'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.pending_question.refresh_from_db()
        self.assertEqual(self.pending_question.answer, '')


class JobApplicationAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username='adminjobs',
            email='adminjobs@example.com',
            password='admin12345',
            is_staff=True
        )
        self.super_admin_user = User.objects.create_user(
            username='admin',
            email='superjobs@example.com',
            password='super12345',
            is_staff=True,
            is_superuser=True
        )
        self.candidate_user = User.objects.create_user(
            username='candidate1',
            email='candidate1@example.com',
            password='candidate12345'
        )
        UserProfile.objects.create(user=self.candidate_user)
        self.merchant_partner_user = User.objects.create_user(
            username='merchantreviewer',
            email='merchantreviewer@example.com',
            password='merchant12345',
            is_staff=True
        )
        UserProfile.objects.create(
            user=self.merchant_partner_user,
            employee_role='merchant_partner',
            is_seller=True,
        )
        self.non_merchant_employee = User.objects.create_user(
            username='warehouseviewer',
            email='warehouseviewer@example.com',
            password='warehouse12345',
            is_staff=True
        )
        UserProfile.objects.create(
            user=self.non_merchant_employee,
            employee_role='warehouse_associate',
        )

    def _job_payload(self, **overrides):
        payload = {
            'full_name': 'Rahul Sharma',
            'email': 'rahul@example.com',
            'phone': '9876543210',
            'city': 'Delhi',
            'role_applied': 'backend_developer',
            'experience_years': '3.5',
            'resume_url': 'https://example.com/resume.pdf',
            'portfolio_url': 'https://example.com/portfolio',
            'message': 'I have experience building Django and React products.',
        }
        payload.update(overrides)
        return payload

    def test_public_can_fetch_job_roles(self):
        response = self.client.get('/api/jobs/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('roles', response.data)
        self.assertGreater(len(response.data['roles']), 0)

    def test_public_can_submit_job_application(self):
        response = self.client.post('/api/jobs/apply/', self._job_payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(JobApplication.objects.filter(email='rahul@example.com').exists())

    def test_recent_duplicate_application_is_blocked(self):
        self.client.post('/api/jobs/apply/', self._job_payload(), format='json')
        second = self.client.post('/api/jobs/apply/', self._job_payload(), format='json')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_view_job_applications(self):
        user = User.objects.create_user(username='basic', password='basic12345')
        self.client.force_authenticate(user=user)
        response = self.client.get('/api/admin/job-applications/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_and_update_job_application_status(self):
        app = JobApplication.objects.create(
            full_name='Sita Devi',
            email='sita@example.com',
            phone='9000000000',
            city='Pune',
            role_applied='delivery_partner',
            experience_years=1,
        )
        self.client.force_authenticate(user=self.admin_user)

        list_response = self.client.get('/api/admin/job-applications/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(list_response.data['count'], 1)

        patch_response = self.client.patch(
            f'/api/admin/job-applications/{app.id}/status/',
            {'status': 'shortlisted'},
            format='json'
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, 'shortlisted')

    def test_super_admin_can_accept_job_application_and_authorize_role(self):
        app = JobApplication.objects.create(
            applicant_user=self.candidate_user,
            full_name='Candidate One',
            email='candidate1@example.com',
            phone='9000000000',
            city='Ahmedabad',
            role_applied='delivery_partner',
            experience_years=2,
        )

        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.post(
            f'/api/super-admin/job-applications/{app.id}/decision/',
            {'decision': 'accept'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.candidate_user.refresh_from_db()
        self.candidate_user.profile.refresh_from_db()
        self.assertEqual(app.status, 'hired')
        self.assertTrue(self.candidate_user.profile.is_seller)
        self.assertFalse(self.candidate_user.is_staff)

    def test_super_admin_can_reject_job_application_and_delete_data(self):
        app = JobApplication.objects.create(
            full_name='Reject Candidate',
            email='reject@example.com',
            phone='9111111111',
            city='Indore',
            role_applied='backend_developer',
            experience_years=3,
        )

        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.post(
            f'/api/super-admin/job-applications/{app.id}/decision/',
            {'decision': 'reject'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(JobApplication.objects.filter(id=app.id).exists())

    def test_non_super_admin_cannot_use_super_admin_job_decision_endpoint(self):
        app = JobApplication.objects.create(
            full_name='Normal Candidate',
            email='normal@example.com',
            phone='9222222222',
            city='Surat',
            role_applied='qa_engineer',
            experience_years=1,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f'/api/super-admin/job-applications/{app.id}/decision/',
            {'decision': 'accept'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_merchant_partner_can_view_only_merchant_applications(self):
        merchant_app = JobApplication.objects.create(
            full_name='Merchant Applicant',
            email='merchantapp@example.com',
            phone='9333333333',
            city='Jaipur',
            role_applied='merchant_partner',
            experience_years=4,
            business_name='Jaipur Foods',
        )
        JobApplication.objects.create(
            full_name='Tech Applicant',
            email='techapp@example.com',
            phone='9444444444',
            city='Pune',
            role_applied='backend_developer',
            experience_years=2,
        )

        self.client.force_authenticate(user=self.merchant_partner_user)
        response = self.client.get('/api/merchant/applications/?status=new')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], merchant_app.id)
        self.assertEqual(response.data['results'][0]['role_applied'], 'merchant_partner')

    def test_merchant_partner_can_accept_merchant_application(self):
        app = JobApplication.objects.create(
            applicant_user=self.candidate_user,
            full_name='Candidate Merchant',
            email='candidate1@example.com',
            phone='9555555555',
            city='Ahmedabad',
            role_applied='merchant_partner',
            experience_years=5,
            business_name='Candidate Mart',
        )

        self.client.force_authenticate(user=self.merchant_partner_user)
        response = self.client.post(
            f'/api/merchant/applications/{app.id}/decision/',
            {'decision': 'accept'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.candidate_user.refresh_from_db()
        self.candidate_user.profile.refresh_from_db()
        self.assertEqual(app.status, 'hired')
        self.assertTrue(self.candidate_user.is_staff)
        self.assertTrue(self.candidate_user.profile.is_seller)
        self.assertEqual(self.candidate_user.profile.employee_role, 'merchant_partner')

    def test_non_merchant_employee_cannot_access_merchant_application_queue(self):
        self.client.force_authenticate(user=self.non_merchant_employee)
        response = self.client.get('/api/merchant/applications/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_admin_username_can_be_super_admin(self):
        user = User.objects.create_user(
            username='teamlead',
            email='teamlead@example.com',
            password='teamlead123',
            is_staff=True
        )
        UserProfile.objects.create(user=user)

        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.patch(
            f'/api/super-admin/users/{user.id}/role/',
            {'is_superuser': True},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_role_filter_includes_staff_and_delivery(self):
        staff_user = User.objects.create_user(
            username='staffrole',
            email='staffrole@example.com',
            password='staff123',
            is_staff=True
        )
        delivery_user = User.objects.create_user(
            username='deliveryrole',
            email='deliveryrole@example.com',
            password='delivery123'
        )
        UserProfile.objects.create(user=delivery_user, is_seller=True)
        customer_user = User.objects.create_user(
            username='customerrole',
            email='customerrole@example.com',
            password='customer123'
        )
        UserProfile.objects.create(user=customer_user, is_seller=False)

        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.get('/api/super-admin/users/?role=employee')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [user['username'] for user in response.data.get('results', [])]
        self.assertIn(staff_user.username, usernames)
        self.assertIn(delivery_user.username, usernames)
        self.assertNotIn(customer_user.username, usernames)

    def test_super_admin_can_delete_non_superadmin_user(self):
        target = User.objects.create_user(
            username='deletecandidate',
            email='deletecandidate@example.com',
            password='delete12345'
        )
        UserProfile.objects.create(user=target)

        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.delete(f'/api/super-admin/users/{target.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=target.id).exists())

    def test_super_admin_cannot_delete_primary_super_admin(self):
        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.delete(f'/api/super-admin/users/{self.super_admin_user.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_super_admin_cannot_delete_user_from_super_admin_endpoint(self):
        target = User.objects.create_user(
            username='nonsuperdelete',
            email='nonsuperdelete@example.com',
            password='delete12345'
        )
        UserProfile.objects.create(user=target)

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/super-admin/users/{target.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_super_admin_can_create_user_from_super_admin_endpoint(self):
        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.post(
            '/api/super-admin/users/',
            {
                'username': 'newemployee',
                'email': 'newemployee@example.com',
                'password': 'newemployee123',
                'first_name': 'New',
                'last_name': 'Employee',
                'gender': 'male',
                'phone': '9555555555',
                'city': 'Delhi',
                'state': 'Delhi',
                'is_staff': True,
                'is_seller': False,
                'is_active': True,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(username='newemployee')
        self.assertEqual(created.email, 'newemployee@example.com')
        self.assertTrue(created.is_staff)
        self.assertFalse(created.is_superuser)
        self.assertEqual(created.profile.city, 'Delhi')
        self.assertEqual(created.profile.gender, 'male')

    def test_super_admin_can_edit_user_from_super_admin_endpoint(self):
        target = User.objects.create_user(
            username='editableuser',
            email='editableuser@example.com',
            password='editable123'
        )
        UserProfile.objects.create(user=target, city='Pune', state='Maharashtra')

        self.client.force_authenticate(user=self.super_admin_user)
        response = self.client.patch(
            f'/api/super-admin/users/{target.id}/',
            {
                'first_name': 'Edited',
                'last_name': 'User',
                'gender': 'female',
                'city': 'Bhopal',
                'state': 'Madhya Pradesh',
                'is_staff': True,
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target.refresh_from_db()
        target.profile.refresh_from_db()
        self.assertEqual(target.first_name, 'Edited')
        self.assertEqual(target.last_name, 'User')
        self.assertEqual(target.profile.gender, 'female')
        self.assertEqual(target.profile.city, 'Bhopal')
        self.assertEqual(target.profile.state, 'Madhya Pradesh')
        self.assertTrue(target.is_staff)

    def test_non_super_admin_cannot_create_or_edit_user_from_super_admin_endpoint(self):
        target = User.objects.create_user(
            username='noteditable',
            email='noteditable@example.com',
            password='noteditable123'
        )
        UserProfile.objects.create(user=target)

        self.client.force_authenticate(user=self.admin_user)
        create_response = self.client.post(
            '/api/super-admin/users/',
            {
                'username': 'blockedcreate',
                'email': 'blockedcreate@example.com',
                'password': 'blocked123'
            },
            format='json'
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        edit_response = self.client.patch(
            f'/api/super-admin/users/{target.id}/',
            {'first_name': 'Blocked'},
            format='json'
        )
        self.assertEqual(edit_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_role_based_access_locks_orders_and_inventory_for_tech_role(self):
        tech_user = User.objects.create_user(
            username='backendemp',
            email='backendemp@example.com',
            password='backend123',
            is_staff=True
        )
        UserProfile.objects.create(user=tech_user, employee_role='backend_developer')

        self.client.force_authenticate(user=tech_user)

        dashboard_response = self.client.get('/api/admin/dashboard/')
        orders_response = self.client.get('/api/admin/orders/')
        inventory_response = self.client.get('/api/admin/products/')

        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertEqual(orders_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(inventory_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_role_based_access_allows_orders_and_inventory_for_warehouse(self):
        warehouse_user = User.objects.create_user(
            username='warehouseemp',
            email='warehouseemp@example.com',
            password='warehouse123',
            is_staff=True
        )
        UserProfile.objects.create(user=warehouse_user, employee_role='warehouse_associate')

        self.client.force_authenticate(user=warehouse_user)

        dashboard_response = self.client.get('/api/admin/dashboard/')
        orders_response = self.client.get('/api/admin/orders/')
        inventory_response = self.client.get('/api/admin/products/')

        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertEqual(orders_response.status_code, status.HTTP_200_OK)
        self.assertEqual(inventory_response.status_code, status.HTTP_200_OK)


class MerchantSubscriptionAPITests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Merchant Groceries')
        self.starter_plan = (
            MerchantSubscriptionPlan.objects.filter(code='starter').first()
            or MerchantSubscriptionPlan.objects.create(
                code='starter',
                name='Starter',
                short_description='Starter plan',
                monthly_price=Decimal('499.00'),
                yearly_price=Decimal('4990.00'),
                product_limit=25,
                commission_rate=Decimal('8.50'),
            )
        )
        self.growth_plan = (
            MerchantSubscriptionPlan.objects.filter(code='growth').first()
            or MerchantSubscriptionPlan.objects.create(
                code='growth',
                name='Growth',
                short_description='Growth plan',
                monthly_price=Decimal('1499.00'),
                yearly_price=Decimal('14990.00'),
                product_limit=150,
                commission_rate=Decimal('6.00'),
                priority_support=True,
                featured_placement=True,
                is_recommended=True,
                sort_order=2,
            )
        )

    def test_public_can_list_merchant_subscription_plans(self):
        response = self.client.get('/api/merchant/subscription/plans/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(len(response.data['results']), 2)
        plan_codes = {plan['code'] for plan in response.data['results']}
        self.assertIn('starter', plan_codes)

    def test_accepting_merchant_application_creates_active_subscription(self):
        reviewer = User.objects.create_user(
            username='merchantreviewer2',
            email='merchantreviewer2@example.com',
            password='merchant12345',
            is_staff=True,
        )
        UserProfile.objects.create(
            user=reviewer,
            employee_role='merchant_partner',
            is_seller=True,
        )
        candidate = User.objects.create_user(
            username='merchantcandidate',
            email='merchantcandidate@example.com',
            password='candidate12345',
        )
        UserProfile.objects.create(user=candidate)
        application = JobApplication.objects.create(
            applicant_user=candidate,
            full_name='Merchant Candidate',
            email='merchantcandidate@example.com',
            phone='9000000000',
            city='Ahmedabad',
            role_applied='merchant_partner',
            business_name='Candidate Mart',
            selected_subscription_plan=self.growth_plan,
            selected_billing_cycle='yearly',
            selected_subscription_amount=self.growth_plan.yearly_price,
            experience_years=3,
        )

        self.client.force_authenticate(user=reviewer)
        response = self.client.post(
            f'/api/merchant/applications/{application.id}/decision/',
            {'decision': 'accept'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        subscription = MerchantSubscription.objects.get(merchant=candidate)
        self.assertEqual(subscription.plan_id, self.growth_plan.id)
        self.assertEqual(subscription.billing_cycle, 'yearly')
        self.assertEqual(subscription.status, 'active')
        self.assertEqual(subscription.amount, self.growth_plan.yearly_price)

    def test_merchant_without_subscription_cannot_go_online_or_add_products(self):
        merchant = User.objects.create_user(
            username='nosubmerchant',
            email='nosubmerchant@example.com',
            password='merchant12345',
            is_staff=True,
        )
        UserProfile.objects.create(
            user=merchant,
            employee_role='merchant_partner',
            is_seller=True,
        )
        self.client.force_authenticate(user=merchant)

        settings_response = self.client.patch(
            '/api/merchant/settings/',
            {'store_status': True},
            format='json',
        )
        self.assertEqual(settings_response.status_code, status.HTTP_400_BAD_REQUEST)

        product_response = self.client.post(
            '/api/merchant/products/',
            {
                'name': 'Merchant Rice Bag',
                'description': '25kg rice bag',
                'category': self.category.id,
                'price': '1200.00',
                'stock': 8,
                'is_active': True,
            },
            format='json',
        )
        self.assertEqual(product_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('subscription', product_response.data)

    def test_merchant_can_activate_subscription_from_settings_endpoint(self):
        merchant = User.objects.create_user(
            username='settingsmerchant',
            email='settingsmerchant@example.com',
            password='merchant12345',
            is_staff=True,
        )
        UserProfile.objects.create(
            user=merchant,
            employee_role='merchant_partner',
            is_seller=True,
        )
        self.client.force_authenticate(user=merchant)

        activate_response = self.client.post(
            '/api/merchant/subscription/',
            {
                'plan_id': self.starter_plan.id,
                'billing_cycle': 'monthly',
                'auto_renew': True,
            },
            format='json',
        )
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            activate_response.data['current_subscription']['plan']['code'],
            'starter',
        )
        self.assertTrue(activate_response.data['product_usage']['can_add_products'])

        fetch_response = self.client.get('/api/merchant/subscription/')
        self.assertEqual(fetch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            fetch_response.data['current_subscription']['plan']['id'],
            self.starter_plan.id,
        )
