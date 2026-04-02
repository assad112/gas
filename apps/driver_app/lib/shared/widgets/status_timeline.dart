import 'package:driver_app/core/utils/formatters.dart';
import 'package:flutter/material.dart';

class StatusTimeline extends StatelessWidget {
  const StatusTimeline({
    super.key,
    required this.currentStage,
  });

  final String currentStage;

  @override
  Widget build(BuildContext context) {
    const stages = [
      'accepted',
      'on_the_way',
      'arrived',
      'delivered',
    ];

    final currentIndex = stages.indexOf(currentStage);

    return Row(
      children: [
        for (var index = 0; index < stages.length; index++) ...[
          Expanded(
            child: Column(
              children: [
                Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: index <= currentIndex
                        ? const Color(0xFFFF7A1A)
                        : const Color(0xFFE4EAF4),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  Formatters.driverStage(stages[index]),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: index <= currentIndex
                            ? const Color(0xFF0E1B38)
                            : const Color(0xFF7D8CA5),
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
          if (index < stages.length - 1)
            Expanded(
              child: Container(
                margin: const EdgeInsets.only(bottom: 28),
                height: 4,
                decoration: BoxDecoration(
                  color: index < currentIndex
                      ? const Color(0xFFFF7A1A)
                      : const Color(0xFFE4EAF4),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
        ],
      ],
    );
  }
}
