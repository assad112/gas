import 'dart:async';
import 'dart:ui';

import 'package:customer_app/app/app.dart';
import 'package:customer_app/core/monitoring/app_error_reporter.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    unawaited(
      AppErrorReporter.instance.captureRuntimeFailure(
        details.exception,
        details.stack ?? StackTrace.current,
        channel: 'flutter',
        metadata: {
          'library': details.library,
          'context': details.context?.toDescription(),
        },
      ),
    );
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    unawaited(
      AppErrorReporter.instance.captureRuntimeFailure(
        error,
        stack,
        channel: 'runtime',
      ),
    );
    return true;
  };

  runApp(const ProviderScope(child: CustomerApp()));
}
