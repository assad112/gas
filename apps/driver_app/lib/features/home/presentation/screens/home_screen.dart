import 'package:driver_app/core/utils/formatters.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/earnings/presentation/screens/earnings_screen.dart';
import 'package:driver_app/features/home/presentation/home_controller.dart';
import 'package:driver_app/features/orders/presentation/screens/order_details_screen.dart';
import 'package:driver_app/features/orders/presentation/screens/order_history_screen.dart';
import 'package:driver_app/features/tracking/presentation/screens/active_delivery_screen.dart';
import 'package:driver_app/features/profile/presentation/profile_controller.dart';
import 'package:driver_app/shared/widgets/app_async_view.dart';
import 'package:driver_app/shared/widgets/order_card.dart';
import 'package:driver_app/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardState = ref.watch(homeControllerProvider);
    final authState = ref.watch(authControllerProvider);
    final driver = authState.driver;

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.read(homeControllerProvider.notifier).refresh(),
          child: ListView(
            physics: const BouncingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
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
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Hello, ${driver?.name ?? 'Driver'}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                driver?.isOnline == true
                                    ? 'You are visible to dispatch and ready for live orders.'
                                    : 'Switch online to receive live delivery requests.',
                                style: const TextStyle(color: Colors.white70),
                              ),
                            ],
                          ),
                        ),
                        Switch.adaptive(
                          value: driver?.isOnline == true,
                          onChanged: (value) async {
                            await ref.read(profileControllerProvider.notifier).setAvailability(
                                  online: value,
                                  busy: driver?.isBusy == true,
                                );
                            await ref.read(authControllerProvider.notifier).refreshDriver();
                            await ref.read(homeControllerProvider.notifier).refreshSilently();
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _HeroMetric(
                          title: 'Availability',
                          value: driver?.isOnline == true ? 'Online' : 'Offline',
                        ),
                        _HeroMetric(
                          title: 'Vehicle',
                          value: driver?.vehicleLabel.isNotEmpty == true
                              ? driver!.vehicleLabel
                              : 'Not set',
                        ),
                        _HeroMetric(
                          title: 'Current status',
                          value: driver?.isBusy == true ? 'Busy' : 'Available',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              dashboardState.when(
                loading: () => const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) => AppAsyncView(
                  isLoading: false,
                  errorMessage: error.toString(),
                  onRetry: () => ref.read(homeControllerProvider.notifier).refresh(),
                  child: const SizedBox.shrink(),
                ),
                data: (dashboard) {
                  final activeOrder =
                      dashboard.activeOrders.isEmpty ? null : dashboard.activeOrders.first;

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        physics: const NeverScrollableScrollPhysics(),
                        childAspectRatio: 1.35,
                        children: [
                          _MetricCard(
                            title: 'Available now',
                            value: dashboard.availableOrdersCount.toString(),
                            icon: Icons.inbox_outlined,
                          ),
                          _MetricCard(
                            title: 'Active deliveries',
                            value: dashboard.activeDeliveries.toString(),
                            icon: Icons.route_rounded,
                          ),
                          _MetricCard(
                            title: 'Completed',
                            value: dashboard.totalCompleted.toString(),
                            icon: Icons.verified_rounded,
                          ),
                          _MetricCard(
                            title: 'Today earnings',
                            value: Formatters.currency(dashboard.todayEarnings),
                            icon: Icons.payments_rounded,
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      const SectionHeader(
                        title: 'Quick actions',
                        subtitle: 'Operate the live delivery day from one place.',
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _QuickAction(
                              icon: Icons.stacked_line_chart_rounded,
                              title: 'Earnings',
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => const EarningsScreen(),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _QuickAction(
                              icon: Icons.history_rounded,
                              title: 'History',
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => const OrderHistoryScreen(),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      if (activeOrder != null) ...[
                        SectionHeader(
                          title: 'Active delivery',
                          trailing: TextButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) =>
                                      ActiveDeliveryScreen(orderId: activeOrder.id),
                                ),
                              );
                            },
                            child: const Text('Open'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        OrderCard(
                          order: activeOrder,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    ActiveDeliveryScreen(orderId: activeOrder.id),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 24),
                      ],
                      const SectionHeader(
                        title: 'Incoming requests',
                        subtitle: 'Live orders ready for acceptance.',
                      ),
                      const SizedBox(height: 12),
                      AppAsyncView(
                        isLoading: false,
                        errorMessage: null,
                        isEmpty: dashboard.availableOrders.isEmpty,
                        emptyTitle: 'No pending orders',
                        emptyMessage:
                            'New requests from customers will appear here in real time.',
                        child: Column(
                          children: dashboard.availableOrders
                              .take(3)
                              .map(
                                (order) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: OrderCard(
                                    order: order,
                                    onTap: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              OrderDetailsScreen(orderId: order.id),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({
    required this.title,
    required this.value,
  });

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  final String title;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: const Color(0xFFFF7A1A)),
            const Spacer(),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF6D7C96),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Ink(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0x1FFF7A1A),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: const Color(0xFFFF7A1A)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
