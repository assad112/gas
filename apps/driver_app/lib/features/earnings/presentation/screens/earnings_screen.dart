import 'package:driver_app/core/utils/formatters.dart';
import 'package:driver_app/features/earnings/presentation/earnings_controller.dart';
import 'package:driver_app/features/orders/presentation/orders_controller.dart';
import 'package:driver_app/shared/widgets/app_async_view.dart';
import 'package:driver_app/shared/widgets/order_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(ordersControllerProvider.notifier).ensureLoaded());
  }

  @override
  Widget build(BuildContext context) {
    final earningsState = ref.watch(earningsControllerProvider);
    final historyOrders = ref.watch(ordersControllerProvider).historyOrders
        .where((order) => order.status == 'delivered')
        .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(earningsControllerProvider.notifier).refresh(),
        child: earningsState.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => AppAsyncView(
            isLoading: false,
            errorMessage: error.toString(),
            onRetry: () => ref.read(earningsControllerProvider.notifier).refresh(),
            child: const SizedBox.shrink(),
          ),
          data: (summary) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.25,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _EarningCard(
                    title: 'Today',
                    value: Formatters.currency(summary.todayEarnings),
                  ),
                  _EarningCard(
                    title: 'Weekly',
                    value: Formatters.currency(summary.weeklyEarnings),
                  ),
                  _EarningCard(
                    title: 'Monthly',
                    value: Formatters.currency(summary.monthlyEarnings),
                  ),
                  _EarningCard(
                    title: 'Lifetime',
                    value: Formatters.currency(summary.lifetimeEarnings),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Text(
                'Completed deliveries',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 12),
              ...historyOrders.take(5).map(
                    (order) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: OrderCard(order: order),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EarningCard extends StatelessWidget {
  const _EarningCard({
    required this.title,
    required this.value,
  });

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF6D7C96),
                  ),
            ),
            const Spacer(),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
