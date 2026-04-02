import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/auth/presentation/screens/login_screen.dart';
import 'package:driver_app/features/earnings/presentation/screens/earnings_screen.dart';
import 'package:driver_app/features/orders/presentation/screens/order_history_screen.dart';
import 'package:driver_app/features/profile/presentation/profile_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final driver = authState.driver;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFF0D1732),
                    Color(0xFF223C78),
                  ],
                ),
                borderRadius: BorderRadius.circular(28),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 34,
                    backgroundColor: Colors.white24,
                    child: Text(
                      (driver?.name.isNotEmpty == true ? driver!.name[0] : 'D')
                          .toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          driver?.name ?? 'Driver',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          driver?.phone ?? '',
                          style: const TextStyle(color: Colors.white70),
                        ),
                        if (driver?.email.isNotEmpty == true)
                          Text(
                            driver!.email,
                            style: const TextStyle(color: Colors.white70),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Expanded(child: Text('Online mode')),
                        Switch.adaptive(
                          value: driver?.isOnline == true,
                          onChanged: (value) async {
                            await ref.read(profileControllerProvider.notifier).setAvailability(
                                  online: value,
                                  busy: driver?.isBusy == true,
                                );
                            await ref.read(authControllerProvider.notifier).refreshDriver();
                          },
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        const Expanded(child: Text('Busy mode')),
                        Switch.adaptive(
                          value: driver?.isBusy == true,
                          onChanged: (value) async {
                            await ref.read(profileControllerProvider.notifier).setAvailability(
                                  online: driver?.isOnline == true,
                                  busy: value,
                                );
                            await ref.read(authControllerProvider.notifier).refreshDriver();
                          },
                        ),
                      ],
                    ),
                    const Divider(),
                    _ProfileRow(
                      label: 'Vehicle',
                      value: driver?.vehicleLabel.isNotEmpty == true
                          ? driver!.vehicleLabel
                          : 'Not assigned yet',
                    ),
                    _ProfileRow(
                      label: 'License',
                      value: driver?.licenseNumber.isNotEmpty == true
                          ? driver!.licenseNumber
                          : 'Not assigned yet',
                    ),
                    _ProfileRow(
                      label: 'Last location',
                      value: driver?.currentLocation.isNotEmpty == true
                          ? driver!.currentLocation
                          : 'No live location yet',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.stacked_line_chart_rounded),
                    title: const Text('Earnings summary'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const EarningsScreen()),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.history_rounded),
                    title: const Text('Order history'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            FilledButton.tonal(
              onPressed: () async {
                await ref.read(authControllerProvider.notifier).logout();
                if (!context.mounted) {
                  return;
                }

                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (_) => false,
                );
              },
              child: const Text('Logout'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF6D7C96),
                  ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
