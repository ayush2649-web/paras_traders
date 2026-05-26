from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_order_assigned_at_order_assigned_delivery_partner_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='employee_role',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]

