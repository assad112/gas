import 'package:driver_app/features/orders/presentation/orders_controller.dart';
import 'package:driver_app/shared/widgets/app_async_view.dart';
import 'package:driver_app/shared/widgets/order_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(ordersControllerProvider.notifier).ensureLoaded());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ordersControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Order history')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _searchController,
            onChanged: (value) {
              ref.read(ordersControllerProvider.notifier).refreshHistory(search: value);
            },
            decoration: const InputDecoration(
              hintText: 'Search delivered and cancelled orders',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.72,
            child: AppAsyncView(
              isLoading: state.isLoading,
              errorMessage: state.errorMessage,
              isEmpty: state.historyOrders.isEmpty,
              emptyTitle: 'No closed orders yet',
              emptyMessage: 'Completed and cancelled deliveries will be archived here.',
              onRetry: () =>
                  ref.read(ordersControllerProvider.notifier).refreshAll(),
              child: ListView.separated(
                itemCount: state.historyOrders.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  return OrderCard(order: state.historyOrders[index]);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
