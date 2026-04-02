import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/orders/presentation/orders_controller.dart';
import 'package:driver_app/features/tracking/presentation/screens/active_delivery_screen.dart';
import 'package:driver_app/shared/widgets/app_async_view.dart';
import 'package:driver_app/shared/widgets/app_chip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OrderDetailsScreen extends ConsumerWidget {
  const OrderDetailsScreen({
    super.key,
    required this.orderId,
  });

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderState = ref.watch(orderDetailsProvider(orderId));
    final pendingIds = ref.watch(ordersControllerProvider).pendingOrderIds;
    final currentDriverId = ref.watch(authControllerProvider).driver?.id;
    final isBusy = pendingIds.contains(orderId);

    return Scaffold(
      appBar: AppBar(title: Text('Order #$orderId')),
      body: orderState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppAsyncView(
          isLoading: false,
          errorMessage: error.toString(),
          onRetry: () => ref.invalidate(orderDetailsProvider(orderId)),
          child: const SizedBox.shrink(),
        ),
        data: (order) {
          final isAssignedToCurrentDriver = currentDriverId == order.assignedDriverId;

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              order.customerName,
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                          ),
                          StatusChip(label: order.driverStage),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(label: 'Phone', value: order.customerPhone),
                      _InfoRow(label: 'Gas type', value: order.gasType),
                      _InfoRow(label: 'Quantity', value: order.quantity.toString()),
                      _InfoRow(label: 'Payment', value: order.paymentMethod),
                      _InfoRow(label: 'Address', value: order.addressFull),
                      _InfoRow(
                        label: 'Notes',
                        value:
                            order.notes.isEmpty ? 'No operational notes' : order.notes,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              if (order.isAvailable) ...[
                FilledButton(
                  onPressed: isBusy
                      ? null
                      : () async {
                          try {
                            await ref.read(ordersControllerProvider.notifier).acceptOrder(order.id);
                            if (!context.mounted) {
                              return;
                            }

                            ref.invalidate(orderDetailsProvider(order.id));
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => ActiveDeliveryScreen(orderId: order.id),
                              ),
                            );
                          } catch (error) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(error.toString())),
                            );
                          }
                        },
                  child: const Text('Accept order'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: isBusy
                      ? null
                      : () async {
                          try {
                            await ref.read(ordersControllerProvider.notifier).rejectOrder(order.id);
                            if (!context.mounted) {
                              return;
                            }

                            Navigator.of(context).pop();
                          } catch (error) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(error.toString())),
                            );
                          }
                        },
                  child: const Text('Reject for me'),
                ),
              ] else if (isAssignedToCurrentDriver && order.isActive) ...[
                FilledButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ActiveDeliveryScreen(orderId: order.id),
                      ),
                    );
                  },
                  child: const Text('Open active delivery'),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
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
