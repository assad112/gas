import 'dart:async';

import 'package:driver_app/core/services/location_service.dart';
import 'package:driver_app/features/orders/data/orders_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

final trackingControllerProvider =
    NotifierProvider<TrackingController, TrackingState>(TrackingController.new);

class TrackingState {
  const TrackingState({
    required this.isSharing,
    required this.activeOrderId,
    required this.currentPosition,
    required this.errorMessage,
  });

  const TrackingState.initial()
      : isSharing = false,
        activeOrderId = null,
        currentPosition = null,
        errorMessage = null;

  final bool isSharing;
  final String? activeOrderId;
  final Position? currentPosition;
  final String? errorMessage;

  TrackingState copyWith({
    bool? isSharing,
    String? activeOrderId,
    Position? currentPosition,
    String? errorMessage,
    bool clearError = false,
    bool clearOrder = false,
  }) {
    return TrackingState(
      isSharing: isSharing ?? this.isSharing,
      activeOrderId: clearOrder ? null : (activeOrderId ?? this.activeOrderId),
      currentPosition: currentPosition ?? this.currentPosition,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class TrackingController extends Notifier<TrackingState> {
  StreamSubscription<Position>? _positionSubscription;

  @override
  TrackingState build() {
    ref.onDispose(() => _positionSubscription?.cancel());
    return const TrackingState.initial();
  }

  Future<void> startSharing(String orderId) async {
    final locationService = ref.read(locationServiceProvider);
    final currentPosition = await locationService.getCurrentPosition();

    if (currentPosition == null) {
      state = state.copyWith(
        errorMessage: 'Location permission is required to share live tracking.',
      );
      return;
    }

    await _positionSubscription?.cancel();

    state = state.copyWith(
      isSharing: true,
      activeOrderId: orderId,
      currentPosition: currentPosition,
      clearError: true,
    );

    await _pushPosition(currentPosition);

    _positionSubscription = locationService.watchPosition().listen(
      (position) async {
        state = state.copyWith(currentPosition: position);
        await _pushPosition(position);
      },
      onError: (Object error) {
        state = state.copyWith(errorMessage: error.toString());
      },
    );
  }

  Future<void> stopSharing() async {
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    state = state.copyWith(isSharing: false, clearOrder: true, clearError: true);
  }

  Future<void> _pushPosition(Position position) {
    return ref.read(ordersRepositoryProvider).updateDriverLocation(
          latitude: position.latitude,
          longitude: position.longitude,
        );
  }
}
