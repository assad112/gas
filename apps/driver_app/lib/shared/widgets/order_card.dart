import 'package:driver_app/core/utils/formatters.dart';
import 'package:driver_app/shared/models/delivery_order.dart';
import 'package:driver_app/shared/widgets/app_chip.dart';
import 'package:flutter/material.dart';

class OrderCard extends StatelessWidget {
  const OrderCard({
    super.key,
    required this.order,
    this.onTap,
    this.trailing,
  });

  final DeliveryOrder order;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Order #${order.id}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  StatusChip(label: order.driverStage),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _InfoTile(
                    icon: Icons.person_outline_rounded,
                    title: order.customerName,
                    subtitle: order.customerPhone,
                  ),
                  _InfoTile(
                    icon: Icons.local_shipping_outlined,
                    title: order.gasType,
                    subtitle: 'Qty ${order.quantity}',
                  ),
                  _InfoTile(
                    icon: Icons.location_on_outlined,
                    title: order.location,
                    subtitle: order.addressFull,
                  ),
                  _InfoTile(
                    icon: Icons.payments_outlined,
                    title: Formatters.currency(order.totalAmount),
                    subtitle: Formatters.paymentMethod(order.paymentMethod),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(
                    Icons.schedule_rounded,
                    size: 18,
                    color: Color(0xFF6D7C96),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      Formatters.dateTime(order.updatedAt ?? order.createdAt),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF6D7C96),
                          ),
                    ),
                  ),
                  if (trailing != null) ...[trailing!],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: const Color(0xFFFF7A1A)),
          const SizedBox(height: 10),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF6D7C96),
                ),
          ),
        ],
      ),
    );
  }
}
