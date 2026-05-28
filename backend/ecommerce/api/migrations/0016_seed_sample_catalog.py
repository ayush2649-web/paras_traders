from django.db import migrations


def seed_sample_catalog(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Product = apps.get_model("api", "Product")

    if Product.objects.filter(is_active=True).exists():
        return

    categories = {
        "Phones & Gadgets": "Smartphones, tablets, headphones, and daily tech accessories.",
        "Work Tech": "Laptops, cameras, tablets, and productivity essentials.",
        "Kitchen Essentials": "Appliances and cookware for modern homes.",
        "Style Picks": "Clothing, footwear, eyewear, and wearable accessories.",
        "Fitness Gear": "Fitness trackers, yoga gear, and home workout products.",
        "Personal Care": "Beauty, grooming, and health-focused products.",
    }

    category_objects = {}
    for name, description in categories.items():
        category_objects[name], _ = Category.objects.get_or_create(
            name=name,
            defaults={"description": description},
        )

    products = [
        {
            "name": "iPhone 15 Pro Max",
            "description": "A17 Pro chip, 256GB storage, titanium design, and a 48MP camera system.",
            "price": "134900.00",
            "original_price": "159900.00",
            "category": "Phones & Gadgets",
            "stock": 25,
            "brand": "Apple",
            "is_featured": True,
        },
        {
            "name": "Samsung Galaxy S24 Ultra",
            "description": "Flagship Android phone with 200MP camera, S Pen, AI features, and AMOLED display.",
            "price": "129999.00",
            "original_price": "144999.00",
            "category": "Phones & Gadgets",
            "stock": 30,
            "brand": "Samsung",
            "is_featured": True,
        },
        {
            "name": "Sony WH-1000XM5",
            "description": "Wireless noise-cancelling headphones with long battery life and clear calling.",
            "price": "26990.00",
            "original_price": "34990.00",
            "category": "Phones & Gadgets",
            "stock": 50,
            "brand": "Sony",
            "is_featured": True,
        },
        {
            "name": "MacBook Air M3",
            "description": "15-inch laptop with M3 chip, Liquid Retina display, 8GB RAM, and 256GB SSD.",
            "price": "134900.00",
            "original_price": "139900.00",
            "category": "Work Tech",
            "stock": 15,
            "brand": "Apple",
            "is_featured": True,
        },
        {
            "name": "Dell XPS 15",
            "description": "Premium Windows laptop with Intel Core i7, 16GB RAM, OLED display, and RTX graphics.",
            "price": "159990.00",
            "original_price": "179990.00",
            "category": "Work Tech",
            "stock": 10,
            "brand": "Dell",
            "is_featured": False,
        },
        {
            "name": "Canon EOS R50",
            "description": "Mirrorless camera with 24.2MP APS-C sensor, 4K video, and fast autofocus.",
            "price": "65990.00",
            "original_price": "72990.00",
            "category": "Work Tech",
            "stock": 12,
            "brand": "Canon",
            "is_featured": False,
        },
        {
            "name": "Dyson V15 Detect",
            "description": "Cordless vacuum cleaner with laser dust detection, HEPA filtration, and strong suction.",
            "price": "62900.00",
            "original_price": "72900.00",
            "category": "Kitchen Essentials",
            "stock": 15,
            "brand": "Dyson",
            "is_featured": True,
        },
        {
            "name": "Philips Air Fryer XXL",
            "description": "Digital air fryer with large capacity, Rapid Air technology, and easy presets.",
            "price": "14999.00",
            "original_price": "19999.00",
            "category": "Kitchen Essentials",
            "stock": 30,
            "brand": "Philips",
            "is_featured": False,
        },
        {
            "name": "Prestige Omega Deluxe Cookware Set",
            "description": "Five-piece non-stick cookware set with granite finish for everyday cooking.",
            "price": "2999.00",
            "original_price": "4999.00",
            "category": "Kitchen Essentials",
            "stock": 40,
            "brand": "Prestige",
            "is_featured": False,
        },
        {
            "name": "Levi's 501 Original Jeans",
            "description": "Classic straight-fit jeans with premium denim and a timeless button-fly design.",
            "price": "3999.00",
            "original_price": "5999.00",
            "category": "Style Picks",
            "stock": 100,
            "brand": "Levi's",
            "is_featured": True,
        },
        {
            "name": "Nike Air Max 270",
            "description": "Lifestyle sneakers with Max Air cushioning, breathable mesh, and durable traction.",
            "price": "12995.00",
            "original_price": "14995.00",
            "category": "Style Picks",
            "stock": 45,
            "brand": "Nike",
            "is_featured": True,
        },
        {
            "name": "Ray-Ban Aviator Classic",
            "description": "Iconic aviator sunglasses with UV protection and a polished metal frame.",
            "price": "8490.00",
            "original_price": "10990.00",
            "category": "Style Picks",
            "stock": 35,
            "brand": "Ray-Ban",
            "is_featured": False,
        },
        {
            "name": "Fitbit Charge 6",
            "description": "Advanced fitness tracker with GPS, heart-rate monitoring, sleep tracking, and long battery life.",
            "price": "14999.00",
            "original_price": "17999.00",
            "category": "Fitness Gear",
            "stock": 35,
            "brand": "Fitbit",
            "is_featured": False,
        },
        {
            "name": "Yoga Mat Premium 6mm",
            "description": "Extra-thick non-slip yoga mat made from comfortable, lightweight material.",
            "price": "1299.00",
            "original_price": "2499.00",
            "category": "Fitness Gear",
            "stock": 100,
            "brand": "Boldfit",
            "is_featured": False,
        },
        {
            "name": "Whey Protein Isolate 2kg",
            "description": "High-protein supplement with 26g protein per serving and zero added sugar.",
            "price": "3999.00",
            "original_price": "5999.00",
            "category": "Fitness Gear",
            "stock": 60,
            "brand": "MuscleBlaze",
            "is_featured": False,
        },
        {
            "name": "Dyson Airwrap Multi-Styler",
            "description": "Complete hair styling tool with Coanda airflow and multiple attachments.",
            "price": "44900.00",
            "original_price": "49900.00",
            "category": "Personal Care",
            "stock": 15,
            "brand": "Dyson",
            "is_featured": True,
        },
        {
            "name": "Cetaphil Moisturizing Cream 550g",
            "description": "Dermatologist-recommended moisturizer for dry to very dry skin.",
            "price": "899.00",
            "original_price": "1299.00",
            "category": "Personal Care",
            "stock": 100,
            "brand": "Cetaphil",
            "is_featured": False,
        },
        {
            "name": "Oral-B iO Series 9",
            "description": "Electric toothbrush with smart brushing recognition, tracking, and magnetic charging.",
            "price": "1899.00",
            "original_price": "2499.00",
            "category": "Personal Care",
            "stock": 25,
            "brand": "Oral-B",
            "is_featured": False,
        },
    ]

    for product in products:
        category_name = product.pop("category")
        Product.objects.get_or_create(
            name=product["name"],
            defaults={
                **product,
                "category": category_objects[category_name],
                "is_active": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0015_merchantsubscriptionplan_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_sample_catalog, migrations.RunPython.noop),
    ]
