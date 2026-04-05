import 'package:customer_app/core/constants/app_colors.dart';
import 'package:customer_app/core/device/device_location_service.dart';
import 'package:customer_app/shared/localization/app_copy.dart';
import 'package:customer_app/shared/models/order_model.dart';
import 'package:customer_app/shared/models/order_status.dart';
import 'package:customer_app/shared/state/customer_app_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  String _formatCurrency(double value, AppCopy copy) {
    return NumberFormat.currency(
      locale: copy.isRtl ? 'ar_OM' : 'en_OM',
      symbol: copy.t('common.omr'),
      decimalDigits: 3,
    ).format(value);
  }

  Future<void> _refreshLocation(
    BuildContext context,
    WidgetRef ref,
    AppCopy copy,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    final result = await ref
        .read(customerAppControllerProvider.notifier)
        .refreshCurrentLocation();
    if (!context.mounted) return;
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          result.success
              ? copy.t('location.updatedSuccess')
              : _locationError(result.failure, copy),
        ),
      ),
    );
  }

  String _locationError(DeviceLocationFailure? f, AppCopy copy) {
    switch (f) {
      case DeviceLocationFailure.serviceDisabled:
        return copy.t('location.serviceDisabled');
      case DeviceLocationFailure.permissionDenied:
        return copy.t('location.permissionDenied');
      case DeviceLocationFailure.permissionDeniedForever:
        return copy.t('location.permissionDeniedForever');
      case DeviceLocationFailure.outOfCoverage:
        return copy.t('location.outOfCoverage');
      case DeviceLocationFailure.unavailable:
      case null:
        return copy.t('location.unavailable');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appState = ref.watch(customerAppControllerProvider);
    final copy = AppCopy(appState.language);
    final isRtl = copy.isRtl;
    final user = appState.user;
    final latestOrder = appState.latestOrder;
    final address = appState.defaultAddress;
    final locationText = address == null
        ? (isRtl ? 'حدد موقعك' : 'Set your location')
        : (address.compactAddress.isNotEmpty
              ? address.compactAddress
              : address.fullAddress);
    final firstName = user?.fullName.split(' ').first ?? '';

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(0, 0, 0, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Top Bar ──────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: _TopBar(
                greeting:
                    '${copy.t('home.greeting')}${firstName.isNotEmpty ? '، $firstName' : ''}',
                locationText: locationText,
                isLoadingLocation: appState.isResolvingCurrentLocation,
                onLocationTap: appState.isResolvingCurrentLocation
                    ? null
                    : () => _refreshLocation(context, ref, copy),
              ),
            ),
            const SizedBox(height: 24),

            // ── Hero Card ────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _HeroCard(
                isRtl: isRtl,
                systemMessage: appState.runtimeSettings.systemMessage,
                onOrderNow: () => context.push('/create-order'),
              ),
            ),
            const SizedBox(height: 20),

            // ── Quick Actions ────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.add_circle_outline_rounded,
                      label: isRtl ? 'طلب جديد' : 'New Order',
                      color: AppColors.brand,
                      onTap: () => context.push('/create-order'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.receipt_long_outlined,
                      label: isRtl ? 'طلباتي' : 'My Orders',
                      color: AppColors.teal,
                      onTap: () => context.go('/orders'),
                    ),
                  ),
                  if (latestOrder != null) ...[
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickAction(
                        icon: Icons.location_on_outlined,
                        label: isRtl ? 'تتبع' : 'Track',
                        color: AppColors.info,
                        onTap: () =>
                            context.push('/tracking/${latestOrder.orderId}'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Latest Order ─────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SectionLabel(text: copy.t('home.latestOrder')),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: latestOrder == null
                  ? _EmptyOrderCard(isRtl: isRtl, copy: copy)
                  : _LastOrderCard(
                      order: latestOrder,
                      copy: copy,
                      onTrack: () =>
                          context.push('/tracking/${latestOrder.orderId}'),
                      formatCurrency: (v) => _formatCurrency(v, copy),
                    ),
            ),
            const SizedBox(height: 24),

            // ── Products ─────────────────────────────────────────────────────
            if (appState.products.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _SectionLabel(text: copy.t('home.availableProducts')),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 160,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: appState.products.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, i) {
                    final product = appState.products[i];
                    return _ProductCard(
                      name: product.localizedName(isRtl),
                      subtitle: product.localizedSubtitle(isRtl),
                      price: _formatCurrency(product.priceOmr, copy),
                      color: _productColor(i),
                      icon: _productIcon(i),
                      onTap: () => context.push('/create-order'),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],

            // ── Services ─────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SectionLabel(text: copy.t('home.services')),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: _ServiceCard(
                      icon: Icons.bolt_rounded,
                      label: copy.t('home.service.fast'),
                      color: AppColors.brand,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ServiceCard(
                      icon: Icons.verified_user_outlined,
                      label: copy.t('home.service.safe'),
                      color: AppColors.teal,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _ServiceCard(
                      icon: Icons.my_location_rounded,
                      label: copy.t('home.service.live'),
                      color: AppColors.info,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Color _productColor(int i) {
    switch (i % 3) {
      case 1:
        return AppColors.teal;
      case 2:
        return AppColors.info;
      default:
        return AppColors.brand;
    }
  }

  static IconData _productIcon(int i) {
    switch (i % 3) {
      case 1:
        return Icons.kitchen_rounded;
      case 2:
        return Icons.home_work_outlined;
      default:
        return Icons.local_fire_department_rounded;
    }
  }
}

// ── Top Bar ───────────────────────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.greeting,
    required this.locationText,
    required this.isLoadingLocation,
    this.onLocationTap,
  });

  final String greeting;
  final String locationText;
  final bool isLoadingLocation;
  final VoidCallback? onLocationTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                greeting,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1A1A2E),
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              GestureDetector(
                onTap: onLocationTap,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.place_rounded,
                      size: 14,
                      color: isLoadingLocation
                          ? AppColors.muted
                          : AppColors.brand,
                    ),
                    const SizedBox(width: 4),
                    isLoadingLocation
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.brand,
                            ),
                          )
                        : Flexible(
                            child: Text(
                              locationText,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.muted,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                    const SizedBox(width: 3),
                    const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      size: 14,
                      color: AppColors.muted,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            color: AppColors.brandSoft,
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.brand.withOpacity(0.2)),
          ),
          child: const Icon(
            Icons.person_outline_rounded,
            color: AppColors.brand,
            size: 22,
          ),
        ),
      ],
    );
  }
}

// ── Hero Card ─────────────────────────────────────────────────────────────────

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.isRtl,
    required this.systemMessage,
    required this.onOrderNow,
  });

  final bool isRtl;
  final String systemMessage;
  final VoidCallback onOrderNow;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(26),
      child: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0D0D1A), Color(0xFF12172B), Color(0xFF0E2148)],
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
          ),
        ),
        child: Stack(
          children: [
            // Decorative glows
            Positioned(
              top: -50,
              right: isRtl ? null : -50,
              left: isRtl ? -50 : null,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppColors.brand.withOpacity(0.18),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: -40,
              left: isRtl ? null : -40,
              right: isRtl ? -40 : null,
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF2563EB).withOpacity(0.15),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            // Subtle grid dots pattern
            Positioned.fill(child: CustomPaint(painter: _DotGridPainter())),
            // Content
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.brand.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: AppColors.brand.withOpacity(0.35),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(
                                  color: AppColors.brand,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isRtl ? 'خدمة متاحة' : 'Service available',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.brand,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        // Main title
                        Text(
                          isRtl
                              ? 'توصيل الغاز\nبسرعة وأمان'
                              : 'Fast & Safe\nGas Delivery',
                          style: const TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            height: 1.2,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 10),
                        // Subtitle
                        Text(
                          isRtl
                              ? 'في أقل من دقيقة — حدد الموقع واطلب'
                              : 'Under a minute — set location & order',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white.withOpacity(0.55),
                            height: 1.5,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                        if (systemMessage.trim().isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.07),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.1),
                              ),
                            ),
                            child: Text(
                              systemMessage,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white.withOpacity(0.85),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 24),
                        // CTA Button
                        GestureDetector(
                          onTap: onOrderNow,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 14,
                            ),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFFF8C2A), AppColors.brand],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.brand.withOpacity(0.5),
                                  blurRadius: 20,
                                  spreadRadius: -2,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.flash_on_rounded,
                                  color: Colors.white,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  isRtl ? 'اطلب الآن' : 'Order Now',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Right side decoration
                  const SizedBox(width: 16),
                  _HeroIcon(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withOpacity(0.06),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Center(
            child: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    AppColors.brand.withOpacity(0.9),
                    AppColors.brandDeep,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: const Icon(
                Icons.propane_tank_outlined,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Text(
            '30 min',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: Colors.white.withOpacity(0.85),
            ),
          ),
        ),
      ],
    );
  }
}

class _DotGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.04)
      ..strokeWidth = 1;
    const spacing = 24.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.2, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ── Quick Action ──────────────────────────────────────────────────────────────

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1A1A2E),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Last Order Card ───────────────────────────────────────────────────────────

class _LastOrderCard extends StatelessWidget {
  const _LastOrderCard({
    required this.order,
    required this.copy,
    required this.onTrack,
    required this.formatCurrency,
  });

  final OrderModel order;
  final AppCopy copy;
  final VoidCallback onTrack;
  final String Function(double) formatCurrency;

  @override
  Widget build(BuildContext context) {
    final status = order.orderStatus;
    final tone = status.tone();
    final softTone = status.softTone();
    final isRtl = copy.isRtl;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: softTone,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.local_fire_department_rounded,
                  color: tone,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.gasProduct.localizedName(isRtl),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1A1A2E),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      order.address.compactAddress.isNotEmpty
                          ? order.address.compactAddress
                          : order.address.fullAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: softTone,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: tone.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: tone,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      copy.t(status.labelKey()),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: tone,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(height: 1, color: Color(0xFFF0F1F6)),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _OrderMeta(
                label: isRtl ? 'الكمية' : 'Qty',
                value: '${order.quantity}',
              ),
              _OrderMeta(
                label: isRtl ? 'الإجمالي' : 'Total',
                value: formatCurrency(order.totalPrice),
                highlight: true,
              ),
              GestureDetector(
                onTap: onTrack,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.brand,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 14,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        copy.t('orders.track'),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OrderMeta extends StatelessWidget {
  const _OrderMeta({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppColors.muted),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: highlight ? AppColors.brand : const Color(0xFF1A1A2E),
          ),
        ),
      ],
    );
  }
}

// ── Empty Order Card ──────────────────────────────────────────────────────────

class _EmptyOrderCard extends StatelessWidget {
  const _EmptyOrderCard({required this.isRtl, required this.copy});

  final bool isRtl;
  final AppCopy copy;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: const Color(0xFFF5F6FA),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFEAECF4)),
            ),
            child: const Icon(
              Icons.inbox_outlined,
              color: AppColors.muted,
              size: 26,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            copy.t('home.noOrders'),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1A1A2E),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isRtl
                ? 'أنشئ طلبك الأول وسيظهر هنا'
                : 'Place your first order and it will appear here',
            style: const TextStyle(fontSize: 12, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}

// ── Product Card ──────────────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.name,
    required this.subtitle,
    required this.price,
    required this.color,
    required this.icon,
    required this.onTap,
  });

  final String name;
  final String subtitle;
  final String price;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 150,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 10),
            Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A1A2E),
              ),
            ),
            const SizedBox(height: 3),
            Expanded(
              child: Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 10,
                  color: AppColors.muted,
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                price,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Service Card ──────────────────────────────────────────────────────────────

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF4A4F6A),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Section Label ─────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w800,
        color: Color(0xFF1A1A2E),
        letterSpacing: 0.2,
      ),
    );
  }
}
