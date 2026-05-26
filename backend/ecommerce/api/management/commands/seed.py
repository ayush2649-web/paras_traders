from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Category, Product, UserProfile
import random


class Command(BaseCommand):
    help = 'Seed the database with sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')

        # Create admin user
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_superuser('admin', 'admin@paras.com', 'admin123')
            UserProfile.objects.create(user=admin, phone='9876543210', city='Delhi')
            self.stdout.write(self.style.SUCCESS('Admin user created'))

        # Create categories
        categories_data = [
            {'name': 'Electronics', 'description': 'Smartphones, laptops, gadgets and more'},
            {'name': 'Fashion', 'description': 'Clothing, shoes, accessories for men and women'},
            {'name': 'Home & Kitchen', 'description': 'Furniture, appliances, cookware and decor'},
            {'name': 'Books', 'description': 'Fiction, non-fiction, academic and more'},
            {'name': 'Sports & Fitness', 'description': 'Equipment, activewear, supplements'},
            {'name': 'Beauty & Health', 'description': 'Skincare, makeup, wellness products'},
        ]

        categories = {}
        for cat_data in categories_data:
            cat, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data['description']}
            )
            categories[cat_data['name']] = cat
            if created:
                self.stdout.write(f'  Created category: {cat.name}')

        # Create products
        products_data = [
            # Electronics
            {'name': 'iPhone 15 Pro Max', 'description': 'Apple iPhone 15 Pro Max with A17 Pro chip, 256GB storage, titanium design. Features a 48MP camera system, always-on display, and USB-C connectivity.', 'price': 134900, 'original_price': 159900, 'category': 'Electronics', 'stock': 25, 'brand': 'Apple', 'is_featured': True, 'image_filename': 'iphone-15-pro-max.png'},
            {'name': 'Samsung Galaxy S24 Ultra', 'description': 'Samsung Galaxy S24 Ultra with Snapdragon 8 Gen 3, 200MP camera, S Pen, AI features. 6.8" Dynamic AMOLED display with titanium frame.', 'price': 129999, 'original_price': 144999, 'category': 'Electronics', 'stock': 30, 'brand': 'Samsung', 'is_featured': True, 'image_filename': 'samsung-galaxy-s24-ultra.png'},
            {'name': 'MacBook Air M3', 'description': 'Apple MacBook Air with M3 chip, 15.3" Liquid Retina display, 8GB RAM, 256GB SSD. Up to 18 hours battery life.', 'price': 134900, 'original_price': 139900, 'category': 'Electronics', 'stock': 15, 'brand': 'Apple', 'is_featured': True, 'image_filename': 'macbook-air-m3.png'},
            {'name': 'Sony WH-1000XM5', 'description': 'Premium wireless noise-cancelling headphones with 30-hour battery, multipoint connection, and crystal-clear calls.', 'price': 26990, 'original_price': 34990, 'category': 'Electronics', 'stock': 50, 'brand': 'Sony', 'is_featured': True, 'image_filename': 'sony-wh-1000xm5.png'},
            {'name': 'iPad Air M2', 'description': 'Apple iPad Air with M2 chip, 11" Liquid Retina display, 128GB. Perfect for creative work with Apple Pencil Pro support.', 'price': 59900, 'original_price': 64900, 'category': 'Electronics', 'stock': 20, 'brand': 'Apple', 'image_filename': 'ipad-air-m2.png'},
            {'name': 'Dell XPS 15', 'description': 'Dell XPS 15 with Intel Core i7-13700H, 16GB RAM, 512GB SSD, NVIDIA RTX 4050. 15.6" 3.5K OLED display.', 'price': 159990, 'original_price': 179990, 'category': 'Electronics', 'stock': 10, 'brand': 'Dell', 'image_filename': 'dell-xps-15.png'},
            {'name': 'AirPods Pro 2', 'description': 'Apple AirPods Pro (2nd gen) with USB-C, Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio.', 'price': 24900, 'original_price': 26900, 'category': 'Electronics', 'stock': 60, 'brand': 'Apple', 'image_filename': 'airpods-pro-2.png'},
            {'name': 'Canon EOS R50', 'description': 'Mirrorless camera with 24.2MP APS-C sensor, 4K video, Dual Pixel CMOS AF II. Ideal for content creators.', 'price': 65990, 'original_price': 72990, 'category': 'Electronics', 'stock': 12, 'brand': 'Canon', 'image_filename': 'canon-eos-r50.png'},

            # Fashion
            {'name': 'Levi\'s 501 Original Jeans', 'description': 'Classic straight-fit jeans with button fly. Made from premium selvedge denim for lasting quality and timeless style.', 'price': 3999, 'original_price': 5999, 'category': 'Fashion', 'stock': 100, 'brand': 'Levi\'s', 'is_featured': True, 'image_filename': 'levis-501-original-jeans.png'},
            {'name': 'Nike Air Max 270', 'description': 'Lifestyle sneakers with Max Air unit for comfort. Mesh upper for breathability, rubber outsole for traction.', 'price': 12995, 'original_price': 14995, 'category': 'Fashion', 'stock': 45, 'brand': 'Nike', 'is_featured': True, 'image_filename': 'nike-air-max-270.png'},
            {'name': 'Ray-Ban Aviator Classic', 'description': 'Iconic aviator sunglasses with polarized G-15 lenses and gold metal frame. UV400 protection.', 'price': 8490, 'original_price': 10990, 'category': 'Fashion', 'stock': 35, 'brand': 'Ray-Ban', 'image_filename': 'ray-ban-aviator-classic.png'},
            {'name': 'Tommy Hilfiger Polo Shirt', 'description': 'Slim fit polo shirt in premium cotton piqué. Classic Tommy flag logo embroidered on chest.', 'price': 3499, 'original_price': 4999, 'category': 'Fashion', 'stock': 80, 'brand': 'Tommy Hilfiger'},
            {'name': 'Adidas Ultraboost 23', 'description': 'Running shoes with BOOST midsole, Continental rubber outsole, and Primeknit+ upper for adaptable comfort.', 'price': 16999, 'original_price': 19999, 'category': 'Fashion', 'stock': 40, 'brand': 'Adidas'},
            {'name': 'Fossil Gen 6 Smartwatch', 'description': 'Wear OS smartwatch with Snapdragon 4100+, heart rate monitor, SpO2, GPS, and NFC payments.', 'price': 18495, 'original_price': 24995, 'category': 'Fashion', 'stock': 25, 'brand': 'Fossil'},

            # Home & Kitchen
            {'name': 'Dyson V15 Detect', 'description': 'Cordless vacuum cleaner with laser dust detection, HEPA filtration, and up to 60 minutes runtime.', 'price': 62900, 'original_price': 72900, 'category': 'Home & Kitchen', 'stock': 15, 'brand': 'Dyson', 'is_featured': True, 'image_filename': 'dyson-v15-detect.png'},
            {'name': 'Philips Air Fryer XXL', 'description': 'Digital air fryer with 7.3L capacity, Rapid Air technology, and smart sensing for perfect results every time.', 'price': 14999, 'original_price': 19999, 'category': 'Home & Kitchen', 'stock': 30, 'brand': 'Philips', 'image_filename': 'philips-air-fryer-xxl.png'},
            {'name': 'Nespresso Vertuo Next', 'description': 'Coffee machine with centrifusion technology, 5 cup sizes, Wi-Fi connected, and one-touch brew system.', 'price': 13990, 'original_price': 16990, 'category': 'Home & Kitchen', 'stock': 20, 'brand': 'Nespresso'},
            {'name': 'IKEA KALLAX Shelf Unit', 'description': '4x4 shelving unit in white. Perfect for organizing books, decor, and storage boxes. 147x147cm.', 'price': 7990, 'original_price': 9990, 'category': 'Home & Kitchen', 'stock': 10, 'brand': 'IKEA'},
            {'name': 'Prestige Omega Deluxe Cookware Set', 'description': '5-piece non-stick cookware set with granite finish. Includes fry pan, kadhai, tawa, saucepan with lids.', 'price': 2999, 'original_price': 4999, 'category': 'Home & Kitchen', 'stock': 40, 'brand': 'Prestige', 'image_filename': 'prestige-omega-cookware-set.png'},

            # Books
            {'name': 'Atomic Habits', 'description': 'An Easy & Proven Way to Build Good Habits & Break Bad Ones by James Clear. Bestselling self-help book.', 'price': 399, 'original_price': 699, 'category': 'Books', 'stock': 200, 'brand': 'Penguin'},
            {'name': 'The Psychology of Money', 'description': 'Timeless Lessons on Wealth, Greed, and Happiness by Morgan Housel. A masterpiece on financial behavior.', 'price': 349, 'original_price': 599, 'category': 'Books', 'stock': 150, 'brand': 'Jaico'},
            {'name': 'Clean Code', 'description': 'A Handbook of Agile Software Craftsmanship by Robert C. Martin. Essential reading for every developer.', 'price': 2499, 'original_price': 3499, 'category': 'Books', 'stock': 50, 'brand': 'Pearson'},
            {'name': 'Sapiens: A Brief History', 'description': 'Sapiens: A Brief History of Humankind by Yuval Noah Harari. A thought-provoking journey through human evolution.', 'price': 449, 'original_price': 699, 'category': 'Books', 'stock': 120, 'brand': 'Vintage'},

            # Sports & Fitness
            {'name': 'Fitbit Charge 6', 'description': 'Advanced fitness tracker with GPS, heart rate, stress management, sleep tracking, and 7-day battery life.', 'price': 14999, 'original_price': 17999, 'category': 'Sports & Fitness', 'stock': 35, 'brand': 'Fitbit'},
            {'name': 'Yoga Mat Premium 6mm', 'description': 'Extra thick non-slip yoga mat with alignment lines. Made from eco-friendly TPE material. 183x61cm.', 'price': 1299, 'original_price': 2499, 'category': 'Sports & Fitness', 'stock': 100, 'brand': 'Boldfit'},
            {'name': 'Whey Protein Isolate 2kg', 'description': 'Premium whey protein isolate with 26g protein per serving. Zero sugar, gluten-free. Double chocolate flavor.', 'price': 3999, 'original_price': 5999, 'category': 'Sports & Fitness', 'stock': 60, 'brand': 'MuscleBlaze'},
            {'name': 'Adjustable Dumbbells 24kg', 'description': 'Space-saving adjustable dumbbell set with 15 weight settings from 2.5kg to 24kg. Quick-change mechanism.', 'price': 19999, 'original_price': 29999, 'category': 'Sports & Fitness', 'stock': 20, 'brand': 'Bowflex'},

            # Beauty & Health
            {'name': 'The Ordinary AHA 30% + BHA 2%', 'description': '10-minute exfoliating facial with alpha and beta hydroxy acids. Targets uneven skin tone and texture.', 'price': 990, 'original_price': 1290, 'category': 'Beauty & Health', 'stock': 80, 'brand': 'The Ordinary'},
             {'name': 'Dyson Airwrap Multi-Styler', 'description': 'Complete hair styling tool with Coanda airflow technology. Curls, waves, smooths, and dries. 6 attachments included.', 'price': 44900, 'original_price': 49900, 'category': 'Beauty & Health', 'stock': 15, 'brand': 'Dyson', 'is_featured': True, 'image_filename': 'dyson-airwrap.png'},
            {'name': 'Cetaphil Moisturizing Cream 550g', 'description': 'Dermatologist recommended moisturizer for dry to very dry skin. Fragrance-free, non-comedogenic.', 'price': 899, 'original_price': 1299, 'category': 'Beauty & Health', 'stock': 100, 'brand': 'Cetaphil'},
            {'name': 'Oral-B iO Series 9', 'description': 'Electric toothbrush with AI-powered brushing recognition, 3D tracking, 7 cleaning modes, and magnetic charging.', 'price': 1899, 'original_price': 2499, 'category': 'Beauty & Health', 'stock': 25, 'brand': 'Oral-B', 'image_filename': 'oral-b-io-series-9.png'},
        ]

        import os
        from django.conf import settings
        from django.core.files import File

        media_products_dir = os.path.join(settings.MEDIA_ROOT, 'products')

        for p_data in products_data:
            cat_name = p_data.pop('category')
            image_filename = p_data.pop('image_filename', None)
            
            product, created = Product.objects.get_or_create(
                name=p_data['name'],
                defaults={
                    **p_data,
                    'category': categories[cat_name]
                }
            )
            
            # If the product already existed, we still want to make sure it has correct fields
            if not created:
                updated = False
                for key, val in p_data.items():
                    if getattr(product, key) != val:
                        setattr(product, key, val)
                        updated = True
                if updated:
                    product.save()

            # Now handle image assignment if image_filename is specified
            if image_filename:
                local_image_path = os.path.join(media_products_dir, image_filename)
                if os.path.exists(local_image_path):
                    try:
                        product.image = f"products/{image_filename}"
                        product.save()
                        self.stdout.write(f"  Set local image path for product: {product.name}")
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"  Failed to set image for {product.name}: {e}"))
                else:
                    self.stdout.write(self.style.WARNING(f"  Image file not found: {local_image_path}"))

        self.stdout.write(self.style.SUCCESS(f'Created/Updated {len(products_data)} products across {len(categories)} categories'))
        self.stdout.write(self.style.SUCCESS('Database seeding complete!'))
