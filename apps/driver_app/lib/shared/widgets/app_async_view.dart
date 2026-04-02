import 'package:flutter/material.dart';

class AppAsyncView extends StatelessWidget {
  const AppAsyncView({
    super.key,
    required this.isLoading,
    required this.errorMessage,
    required this.child,
    this.onRetry,
    this.emptyTitle,
    this.emptyMessage,
    this.isEmpty = false,
  });

  final bool isLoading;
  final bool isEmpty;
  final String? errorMessage;
  final String? emptyTitle;
  final String? emptyMessage;
  final VoidCallback? onRetry;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (errorMessage != null && errorMessage!.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 42),
              const SizedBox(height: 12),
              Text(
                errorMessage!,
                textAlign: TextAlign.center,
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: onRetry,
                  child: const Text('Retry'),
                ),
              ],
            ],
          ),
        ),
      );
    }

    if (isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.inventory_2_outlined, size: 42),
              const SizedBox(height: 12),
              Text(
                emptyTitle ?? 'Nothing here yet',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (emptyMessage != null) ...[
                const SizedBox(height: 8),
                Text(
                  emptyMessage!,
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ),
      );
    }

    return child;
  }
}
