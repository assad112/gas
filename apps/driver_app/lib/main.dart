import 'dart:async';
import 'dart:ui';

import 'package:driver_app/app/app.dart';
import 'package:driver_app/core/monitoring/app_error_reporter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Future<void> main() async {
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

  runApp(const ProviderScope(child: DriverApp()));
}
