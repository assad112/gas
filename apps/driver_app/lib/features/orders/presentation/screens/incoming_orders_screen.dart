import 'package:driver_app/features/orders/presentation/orders_controller.dart';
import 'package:driver_app/features/orders/presentation/screens/order_details_screen.dart';
import 'package:driver_app/features/orders/presentation/screens/order_history_screen.dart';
import 'package:driver_app/shared/widgets/app_async_view.dart';
import 'package:driver_app/shared/widgets/order_card.dart';
import 'package:driver_app/shared/widgets/section_header.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class IncomingOrdersScreen extends ConsumerStatefulWidget {
  const IncomingOrdersScreen({super.key});

  @override
  ConsumerState<IncomingOrdersScreen> createState() =>
      _IncomingOrdersScreenState();
}

class _IncomingOrdersScreenState extends ConsumerState<IncomingOrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    Future.microtask(() => ref.read(ordersControllerProvider.notifier).ensureLoaded());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ordersControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          IconButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
              );
            },
            icon: const Icon(Icons.history_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(ordersControllerProvider.notifier).refreshAll(),
        child: ListView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            TextField(
              controller: _searchController,
              onChanged: (value) {
                ref.read(ordersControllerProvider.notifier).refreshAvailable(
                      search: value,
                    );
              },
              decoration: const InputDecoration(
                hintText: 'Search by order id, customer, phone, or location',
                prefixIcon: Icon(Icons.search_rounded),
              ),
            ),
            const SizedBox(height: 18),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: const Color(0x1FFF7A1A),
                  borderRadius: BorderRadius.circular(20),
                ),
                dividerColor: Colors.transparent,
                labelColor: const Color(0xFFFF7A1A),
                unselectedLabelColor: const Color(0xFF62718C),
                tabs: [
                  Tab(text: 'Available (${state.availableOrders.length})'),
                  Tab(text: 'Active (${state.activeOrders.length})'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.72,
              child: TabBarView(
                controller: _tabController,
                children: [
                  AppAsyncView(
                    isLoading: state.isLoading,
                    errorMessage: state.errorMessage,
                    isEmpty: state.availableOrders.isEmpty,
                    emptyTitle: 'No live requests',
                    emptyMessage: 'When the backend publishes a new order, it will appear here instantly.',
                    onRetry: () =>
                        ref.read(ordersControllerProvider.notifier).refreshAll(),
                    child: ListView.separated(
                      itemCount: state.availableOrders.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final order = state.availableOrders[index];
                        return OrderCard(
                          order: order,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => OrderDetailsScreen(orderId: order.id),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                  AppAsyncView(
                    isLoading: state.isLoading,
                    errorMessage: state.errorMessage,
                    isEmpty: state.activeOrders.isEmpty,
                    emptyTitle: 'No active delivery',
                    emptyMessage: 'Accepted orders in progress will stay here until completion.',
                    onRetry: () =>
                        ref.read(ordersControllerProvider.notifier).refreshAll(),
                    child: ListView(
                      children: [
                        const SectionHeader(
                          title: 'Current delivery queue',
                          subtitle: 'Manage active customer deliveries in real time.',
                        ),
                        const SizedBox(height: 12),
                        ...state.activeOrders.map(
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
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
