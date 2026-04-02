import 'package:driver_app/core/utils/formatters.dart';
import 'package:driver_app/features/notifications/presentation/notifications_controller.dart';
import 'package:driver_app/shared/widgets/app_async_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsState = ref.watch(notificationsControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(notificationsControllerProvider.notifier).refresh(),
        child: notificationsState.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => AppAsyncView(
            isLoading: false,
            errorMessage: error.toString(),
            onRetry: () => ref.read(notificationsControllerProvider.notifier).refresh(),
            child: const SizedBox.shrink(),
          ),
          data: (notifications) => AppAsyncView(
            isLoading: false,
            errorMessage: null,
            isEmpty: notifications.isEmpty,
            emptyTitle: 'No notifications yet',
            emptyMessage: 'Live order updates and delivery alerts will show here.',
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              itemCount: notifications.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(18),
                    leading: CircleAvatar(
                      backgroundColor: const Color(0x1FFF7A1A),
                      foregroundColor: const Color(0xFFFF7A1A),
                      child: const Icon(Icons.notifications_active_outlined),
                    ),
                    title: Text(
                      notification.title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(notification.body),
                    ),
                    trailing: Text(
                      Formatters.time(notification.timestamp),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF6D7C96),
                          ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
