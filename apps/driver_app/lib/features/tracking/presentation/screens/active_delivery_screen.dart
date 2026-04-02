import 'package:driver_app/core/utils/formatters.dart';
import 'package:driver_app/features/orders/presentation/orders_controller.dart';
import 'package:driver_app/features/tracking/presentation/tracking_controller.dart';
import 'package:driver_app/shared/widgets/app_async_view.dart';
import 'package:driver_app/shared/widgets/app_chip.dart';
import 'package:driver_app/shared/widgets/status_timeline.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class ActiveDeliveryScreen extends ConsumerStatefulWidget {
  const ActiveDeliveryScreen({
    super.key,
    required this.orderId,
  });

  final String orderId;

  @override
  ConsumerState<ActiveDeliveryScreen> createState() =>
      _ActiveDeliveryScreenState();
}

class _ActiveDeliveryScreenState extends ConsumerState<ActiveDeliveryScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(trackingControllerProvider.notifier).startSharing(widget.orderId);
    });
  }

  @override
  void dispose() {
    ref.read(trackingControllerProvider.notifier).stopSharing();
    super.dispose();
  }

  Future<void> _openNavigation({
    required String address,
    double? latitude,
    double? longitude,
  }) async {
    final url = latitude != null && longitude != null
        ? Uri.parse(
            'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude',
          )
        : Uri.parse(
            'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(address)}',
          );

    await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  Future<void> _callCustomer(String phone) async {
    await launchUrl(
      Uri.parse('tel:$phone'),
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) {
    final orderState = ref.watch(orderDetailsProvider(widget.orderId));
    final trackingState = ref.watch(trackingControllerProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Delivery #${widget.orderId}')),
      body: orderState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => AppAsyncView(
          isLoading: false,
          errorMessage: error.toString(),
          onRetry: () => ref.invalidate(orderDetailsProvider(widget.orderId)),
          child: const SizedBox.shrink(),
        ),
        data: (order) {
          final driverPosition = trackingState.currentPosition;
          final customerLatLng = order.customerLatitude != null &&
                  order.customerLongitude != null
              ? LatLng(order.customerLatitude!, order.customerLongitude!)
              : null;
          final driverLatLng = driverPosition != null
              ? LatLng(driverPosition.latitude, driverPosition.longitude)
              : order.driverLatitude != null && order.driverLongitude != null
                  ? LatLng(order.driverLatitude!, order.driverLongitude!)
                  : null;

          final distanceMeters =
              customerLatLng != null && driverLatLng != null
                  ? Geolocator.distanceBetween(
                      driverLatLng.latitude,
                      driverLatLng.longitude,
                      customerLatLng.latitude,
                      customerLatLng.longitude,
                    )
                  : null;
          final etaMinutes =
              distanceMeters != null ? (distanceMeters / 450).ceil().clamp(3, 120) : null;

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (customerLatLng != null || driverLatLng != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: SizedBox(
                    height: 260,
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: customerLatLng ?? driverLatLng!,
                        zoom: 13.5,
                      ),
                      myLocationEnabled: true,
                      myLocationButtonEnabled: true,
                      zoomControlsEnabled: false,
                      markers: {
                        if (customerLatLng != null)
                          Marker(
                            markerId: const MarkerId('customer'),
                            position: customerLatLng,
                            infoWindow: InfoWindow(title: order.customerName),
                          ),
                        if (driverLatLng != null)
                          Marker(
                            markerId: const MarkerId('driver'),
                            position: driverLatLng,
                            icon: BitmapDescriptor.defaultMarkerWithHue(
                              BitmapDescriptor.hueOrange,
                            ),
                            infoWindow: const InfoWindow(title: 'Driver'),
                          ),
                      },
                      polylines: {
                        if (customerLatLng != null && driverLatLng != null)
                          Polyline(
                            polylineId: const PolylineId('route'),
                            points: [driverLatLng, customerLatLng],
                            color: const Color(0xFFFF7A1A),
                            width: 5,
                          ),
                      },
                    ),
                  ),
                )
              else
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      children: const [
                        Icon(Icons.map_outlined, size: 42),
                        SizedBox(height: 12),
                        Text(
                          'Customer coordinates are not yet available from backend.',
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
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
                      const SizedBox(height: 10),
                      Text(
                        order.addressFull,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              color: const Color(0xFF62718C),
                            ),
                      ),
                      const SizedBox(height: 16),
                      StatusTimeline(currentStage: order.driverStage),
                      const SizedBox(height: 18),
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _MetaCard(
                            label: 'Distance',
                            value: distanceMeters == null
                                ? 'Unknown'
                                : '${(distanceMeters / 1000).toStringAsFixed(1)} km',
                          ),
                          _MetaCard(
                            label: 'ETA',
                            value: etaMinutes == null ? 'Unknown' : '$etaMinutes min',
                          ),
                          _MetaCard(
                            label: 'Payment',
                            value: order.paymentMethod,
                          ),
                          _MetaCard(
                            label: 'Total',
                            value: Formatters.currency(order.totalAmount),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _callCustomer(order.customerPhone),
                      icon: const Icon(Icons.call_outlined),
                      label: const Text('Call customer'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _openNavigation(
                        address: order.addressFull,
                        latitude: order.customerLatitude,
                        longitude: order.customerLongitude,
                      ),
                      icon: const Icon(Icons.navigation_rounded),
                      label: const Text('Navigate'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _StageActions(
                currentStage: order.driverStage,
                onAdvance: (stage) async {
                  try {
                    await ref.read(ordersControllerProvider.notifier).updateStage(
                          orderId: order.id,
                          stage: stage,
                        );
                    ref.invalidate(orderDetailsProvider(order.id));

                    if (!context.mounted) {
                      return;
                    }

                    if (stage == 'delivered') {
                      Navigator.of(context).pop();
                    }
                  } catch (error) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(error.toString())),
                    );
                  }
                },
              ),
              if (trackingState.errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  trackingState.errorMessage!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.error,
                      ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _MetaCard extends StatelessWidget {
  const _MetaCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFD),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF6D7C96),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class _StageActions extends StatelessWidget {
  const _StageActions({
    required this.currentStage,
    required this.onAdvance,
  });

  final String currentStage;
  final Future<void> Function(String stage) onAdvance;

  @override
  Widget build(BuildContext context) {
    final actions = <MapEntry<String, String>>[];

    if (currentStage == 'accepted') {
      actions.add(const MapEntry('on_the_way', 'Start trip'));
    } else if (currentStage == 'on_the_way') {
      actions.add(const MapEntry('arrived', 'Mark arrived'));
    } else if (currentStage == 'arrived') {
      actions.add(const MapEntry('delivered', 'Complete delivery'));
    }

    if (actions.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: actions
          .map(
            (action) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: FilledButton(
                onPressed: () => onAdvance(action.key),
                child: Text(action.value),
              ),
            ),
          )
          .toList(),
    );
  }
}
