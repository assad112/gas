import 'package:driver_app/core/localization/app_strings.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/core/utils/formatters.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/auth/presentation/screens/login_screen.dart';
import 'package:driver_app/features/earnings/presentation/screens/earnings_screen.dart';
import 'package:driver_app/features/home/presentation/home_controller.dart';
import 'package:driver_app/features/orders/presentation/screens/order_history_screen.dart';
import 'package:driver_app/features/profile/presentation/profile_controller.dart';
import 'package:driver_app/shared/widgets/language_switcher.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);
    final dashboardState = ref.watch(homeControllerProvider);
    final driver = authState.driver;
    final strings = context.strings;
    final textTheme = Theme.of(context).textTheme;

    final syncTime = driver?.lastLocationAt ?? driver?.lastSeenAt;
    final completedValue =
        dashboardState.valueOrNull?.totalCompleted.toString() ?? '0';
    final activeValue =
        dashboardState.valueOrNull?.activeDeliveries.toString() ?? '0';
    final earningsValue = Formatters.currency(
      dashboardState.valueOrNull?.todayEarnings ?? 0,
      localeCode: strings.localeCode,
    );

    Future<void> refreshAll() async {
      await ref.read(authControllerProvider.notifier).refreshDriver();
      await ref.read(homeControllerProvider.notifier).refreshSilently();
    }

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: refreshAll,
          color: AppColors.primary,
          child: ListView(
            physics: const BouncingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
            padding: const EdgeInsets.all(20),
            children: [
              // ── Page header ───────────────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          strings.profileTitle,
                          style: textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          strings.profileSubtitle,
                          style: textTheme.bodySmall?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  const LanguageSwitcher(compact: true),
                ],
              ),
              const SizedBox(height: 20),
              // ── Profile hero card ─────────────────────────
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF0D1732),
                      Color(0xFF1B2E5B),
                      Color(0xFF26457E),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0D1732).withOpacity(0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        // Avatar
                        Container(
                          width: 68,
                          height: 68,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.primary.withOpacity(0.8),
                                AppColors.primary,
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: Center(
                            child: Text(
                              (driver?.name.isNotEmpty == true
                                      ? driver!.name.substring(0, 1)
                                      : 'D')
                                  .toUpperCase(),
                              style: textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                driver?.name ?? strings.driverLabel,
                                style: textTheme.titleLarge?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 6),
                              _ContactRow(
                                icon: Icons.phone_rounded,
                                text: driver?.phone ?? '--',
                              ),
                              if (driver?.email.isNotEmpty == true) ...[
                                const SizedBox(height: 4),
                                _ContactRow(
                                  icon: Icons.alternate_email_rounded,
                                  text: driver!.email,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    // Status badges
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _StatusBadge(
                          icon: Icons.wifi_tethering_rounded,
                          label: driver?.isOnline == true
                              ? strings.online
                              : strings.offline,
                          active: driver?.isOnline == true,
                          activeColor: AppColors.success,
                        ),
                        _StatusBadge(
                          icon: Icons.local_shipping_rounded,
                          label: driver?.isBusy == true
                              ? strings.busy
                              : strings.available,
                          active: driver?.isBusy != true,
                          activeColor: AppColors.info,
                        ),
                        _StatusBadge(
                          icon: Icons.location_on_outlined,
                          label: syncTime == null
                              ? strings.noSyncYet
                              : Formatters.time(
                                  syncTime,
                                  localeCode: strings.localeCode,
                                ),
                          active: syncTime != null,
                          activeColor: AppColors.warning,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // ── Performance metrics ───────────────────────
              _SectionCard(
                title: strings.profilePerformance,
                child: Row(
                  children: [
                    Expanded(
                      child: _MetricTile(
                        icon: Icons.verified_rounded,
                        color: AppColors.success,
                        title: strings.completed,
                        value: completedValue,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _MetricTile(
                        icon: Icons.route_rounded,
                        color: AppColors.info,
                        title: strings.activeDeliveries,
                        value: activeValue,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _MetricTile(
                        icon: Icons.payments_rounded,
                        color: AppColors.warning,
                        title: strings.todayEarnings,
                        value: earningsValue,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // ── Availability controls ─────────────────────
              _SectionCard(
                title: strings.profileControls,
                child: Column(
                  children: [
                    _SwitchTile(
                      icon: Icons.power_settings_new_rounded,
                      iconColor: AppColors.success,
                      title: strings.onlineMode,
                      subtitle: driver?.isOnline == true
                          ? strings.onlineReadyMessage
                          : strings.offlineReadyMessage,
                      value: driver?.isOnline == true,
                      onChanged: (value) async {
                        await ref
                            .read(profileControllerProvider.notifier)
                            .setAvailability(
                              online: value,
                              busy: driver?.isBusy == true,
                            );
                        await refreshAll();
                      },
                    ),
                    const SizedBox(height: 10),
                    _SwitchTile(
                      icon: Icons.work_history_rounded,
                      iconColor: AppColors.warning,
                      title: strings.busyMode,
                      subtitle: driver?.isBusy == true
                          ? strings.currentStatus
                          : strings.availability,
                      value: driver?.isBusy == true,
                      onChanged: (value) async {
                        await ref
                            .read(profileControllerProvider.notifier)
                            .setAvailability(
                              online: driver?.isOnline == true,
                              busy: value,
                            );
                        await refreshAll();
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // ── Account details ───────────────────────────
              _SectionCard(
                title: strings.accountDetails,
                child: Column(
                  children: [
                    _InfoRow(
                      icon: Icons.local_shipping_outlined,
                      iconColor: AppColors.primary,
                      label: strings.vehicle,
                      value: driver?.vehicleLabel.isNotEmpty == true
                          ? driver!.vehicleLabel
                          : strings.notAssignedYet,
                    ),
                    _InfoRow(
                      icon: Icons.badge_outlined,
                      iconColor: AppColors.info,
                      label: strings.license,
                      value: driver?.licenseNumber.isNotEmpty == true
                          ? driver!.licenseNumber
                          : strings.notAssignedYet,
                    ),
                    _InfoRow(
                      icon: Icons.place_outlined,
                      iconColor: AppColors.error,
                      label: strings.lastLocation,
                      value: driver?.currentLocation.isNotEmpty == true
                          ? driver!.currentLocation
                          : strings.noLiveLocationYet,
                    ),
                    _InfoRow(
                      icon: Icons.update_rounded,
                      iconColor: AppColors.textSecondary,
                      label: strings.lastSync,
                      value: syncTime == null
                          ? strings.noSyncYet
                          : Formatters.dateTime(
                              syncTime,
                              localeCode: strings.localeCode,
                            ),
                      isLast: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              // ── Language ──────────────────────────────────
              _SectionCard(
                title: strings.manageLanguage,
                child: const Center(child: LanguageSwitcher()),
              ),
              const SizedBox(height: 12),
              // ── Quick links ───────────────────────────────
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    _ActionTile(
                      icon: Icons.stacked_line_chart_rounded,
                      iconColor: AppColors.success,
                      title: strings.earningsSummary,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const EarningsScreen(),
                          ),
                        );
                      },
                    ),
                    const Divider(height: 1, indent: 70),
                    _ActionTile(
                      icon: Icons.history_rounded,
                      iconColor: AppColors.info,
                      title: strings.orderHistoryTitle,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const OrderHistoryScreen(),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              // ── Logout ────────────────────────────────────
              Container(
                decoration: BoxDecoration(
                  color: AppColors.errorSoft,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: ListTile(
                  leading: const Icon(
                    Icons.logout_rounded,
                    color: AppColors.error,
                  ),
                  title: Text(
                    strings.logout,
                    style: textTheme.titleSmall?.copyWith(
                      color: AppColors.error,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  trailing: const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.error,
                  ),
                  onTap: () async {
                    await ref.read(authControllerProvider.notifier).logout();
                    if (!context.mounted) return;
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (_) => false,
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Sub-widgets ──────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 13, color: Colors.white54),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: Colors.white70),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.icon,
    required this.label,
    required this.active,
    required this.activeColor,
  });

  final IconData icon;
  final String label;
  final bool active;
  final Color activeColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: active
            ? activeColor.withOpacity(0.15)
            : Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(
          color: active
              ? activeColor.withOpacity(0.3)
              : Colors.white.withOpacity(0.1),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: active ? activeColor : Colors.white38),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: active ? Colors.white : Colors.white38,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 3),
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.labelSmall?.copyWith(color: AppColors.textSecondary),
            textAlign: TextAlign.center,
            maxLines: 2,
          ),
        ],
      ),
    );
  }
}

class _SwitchTile extends StatelessWidget {
  const _SwitchTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
    this.isLast = false,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, size: 17, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textTertiary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (!isLast)
          const Divider(height: 1, indent: 48, color: AppColors.border),
      ],
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(
        title,
        style: Theme.of(
          context,
        ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textTertiary,
      ),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    );
  }
}
