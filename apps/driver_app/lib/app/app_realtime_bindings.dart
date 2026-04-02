import 'package:driver_app/core/realtime/socket_service.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/home/presentation/home_controller.dart';
import 'package:driver_app/features/notifications/presentation/notifications_controller.dart';
import 'package:driver_app/features/orders/presentation/orders_controller.dart';
import 'package:driver_app/features/profile/presentation/profile_controller.dart';
import 'package:driver_app/shared/models/delivery_order.dart';
import 'package:driver_app/shared/models/driver_notification.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final appRealtimeBindingsProvider = Provider<void>((ref) {
  final socketService = ref.watch(socketServiceProvider);

  final subscription = socketService.events.listen((event) {
    if (event.payload is! Map) {
      return;
    }

    final payload = Map<String, dynamic>.from(event.payload as Map);

    switch (event.name) {
      case 'new_order':
      case 'order_updated':
      case 'order_status_changed':
        final order = DeliveryOrder.fromJson(payload);
        ref.read(ordersControllerProvider.notifier).handleRealtime(order);
        ref.read(homeControllerProvider.notifier).refreshSilently();
        ref
            .read(notificationsControllerProvider.notifier)
            .prepend(
              DriverNotificationItem.fromBackend({
                ...payload,
                'notification_type': event.name == 'new_order'
                    ? 'new_order'
                    : payload['driver_stage'] ?? payload['status'],
              }),
            );
        break;
      case 'driver_notification':
        ref
            .read(notificationsControllerProvider.notifier)
            .prepend(DriverNotificationItem.fromRealtime(payload));
        break;
      case 'driver_updated':
      case 'driver_location_updated':
        ref.read(authControllerProvider.notifier).refreshDriver();
        ref.invalidate(profileControllerProvider);
        ref.read(homeControllerProvider.notifier).refreshSilently();
        break;
    }
  });

  ref.onDispose(subscription.cancel);
});
