import 'package:flutter_riverpod/flutter_riverpod.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return const NotificationService();
});

class NotificationService {
  const NotificationService();

  Future<void> initialize() async {
    // TODO(driver-app): Wire Firebase Cloud Messaging after native
    // configuration (google-services.json / GoogleService-Info.plist)
    // is available for the driver project.
  }
}
