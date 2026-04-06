import 'package:driver_app/features/notifications/data/notifications_repository.dart';
import 'package:driver_app/shared/models/driver_notification.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final notificationsControllerProvider =
    AsyncNotifierProvider<
      NotificationsController,
      List<DriverNotificationItem>
    >(NotificationsController.new);

class NotificationsController
    extends AsyncNotifier<List<DriverNotificationItem>> {
  @override
  Future<List<DriverNotificationItem>> build() {
    return ref.read(notificationsRepositoryProvider).fetchNotifications();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(notificationsRepositoryProvider).fetchNotifications(),
    );
  }

  Future<void> refreshSilently() async {
    try {
      final notifications = await ref
          .read(notificationsRepositoryProvider)
          .fetchNotifications();
      state = AsyncData(notifications);
    } catch (_) {
      // Preserve the current list on silent failures.
    }
  }

  void prepend(DriverNotificationItem item) {
    final current = state.valueOrNull ?? const <DriverNotificationItem>[];
    state = AsyncData([
      item,
      ...current.where((existing) => existing.id != item.id),
    ]);
  }
}
