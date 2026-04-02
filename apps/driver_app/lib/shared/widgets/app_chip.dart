import 'package:flutter/material.dart';
import 'package:driver_app/core/utils/formatters.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    this.icon,
  });

  final String label;
  final IconData? icon;

  Color get _backgroundColor {
    switch (label) {
      case 'accepted':
      case 'Accepted':
        return const Color(0x1F14B86A);
      case 'on_the_way':
      case 'On the way':
        return const Color(0x1F2563EB);
      case 'arrived':
      case 'Arrived':
        return const Color(0x1FF97316);
      case 'delivered':
      case 'Delivered':
        return const Color(0x1F0F9D58);
      case 'cancelled':
      case 'Cancelled':
        return const Color(0x1FDC2626);
      case 'pending':
      case 'new_order':
      case 'New order':
        return const Color(0x1FFF7A1A);
      default:
        return const Color(0xFFF0F4FA);
    }
  }

  Color get _foregroundColor {
    switch (label) {
      case 'accepted':
      case 'Accepted':
        return const Color(0xFF0F9D58);
      case 'on_the_way':
      case 'On the way':
        return const Color(0xFF2563EB);
      case 'arrived':
      case 'Arrived':
        return const Color(0xFFF97316);
      case 'delivered':
      case 'Delivered':
        return const Color(0xFF0F9D58);
      case 'cancelled':
      case 'Cancelled':
        return const Color(0xFFDC2626);
      case 'pending':
      case 'new_order':
      case 'New order':
        return const Color(0xFFFF7A1A);
      default:
        return const Color(0xFF44536C);
    }
  }

  @override
  Widget build(BuildContext context) {
    final normalizedLabel = label.contains('_') ? Formatters.driverStage(label) : label;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 15, color: _foregroundColor),
            const SizedBox(width: 6),
          ],
          Text(
            normalizedLabel,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: _foregroundColor,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}
