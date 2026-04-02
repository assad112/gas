import 'package:driver_app/core/realtime/socket_service.dart';
import 'package:driver_app/core/services/notification_service.dart';
import 'package:driver_app/core/storage/session_storage.dart';
import 'package:driver_app/features/auth/data/auth_repository.dart';
import 'package:driver_app/features/auth/presentation/auth_state.dart';
import 'package:driver_app/shared/models/driver_profile.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    return const AuthState.initial();
  }

  Future<void> bootstrap() async {
    if (state.hasBootstrapped || state.isLoading) {
      return;
    }

    state = state.copyWith(isLoading: true, clearError: true);

    final sessionStorage = ref.read(sessionStorageProvider);
    final authRepository = ref.read(authRepositoryProvider);
    final notificationService = ref.read(notificationServiceProvider);

    await notificationService.initialize();

    try {
      final token = await sessionStorage.readToken();
      final cachedDriver = await sessionStorage.readDriver();

      if (token == null || token.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          hasBootstrapped: true,
          clearToken: true,
          clearDriver: true,
        );
        return;
      }

      if (cachedDriver != null) {
        state = state.copyWith(
          token: token,
          driver: cachedDriver,
          hasBootstrapped: true,
        );
      }

      final currentDriver = await authRepository.fetchCurrentDriver();
      await sessionStorage.saveSession(token: token, driver: currentDriver);
      ref.read(socketServiceProvider).connect(token);

      state = state.copyWith(
        isLoading: false,
        hasBootstrapped: true,
        token: token,
        driver: currentDriver,
        clearError: true,
      );
    } catch (error) {
      await sessionStorage.clear();
      ref.read(socketServiceProvider).disconnect();

      state = state.copyWith(
        isLoading: false,
        hasBootstrapped: true,
        clearToken: true,
        clearDriver: true,
        errorMessage: error.toString(),
      );
    }
  }

  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final result = await ref.read(authRepositoryProvider).login(
            identifier: identifier,
            password: password,
          );

      await ref
          .read(sessionStorageProvider)
          .saveSession(token: result.token, driver: result.driver);
      ref.read(socketServiceProvider).connect(result.token);

      state = state.copyWith(
        isLoading: false,
        hasBootstrapped: true,
        token: result.token,
        driver: result.driver,
      );
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String phone,
    required String password,
    String? email,
    String? vehicleLabel,
    String? licenseNumber,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final result = await ref.read(authRepositoryProvider).register(
            name: name,
            phone: phone,
            password: password,
            email: email,
            vehicleLabel: vehicleLabel,
            licenseNumber: licenseNumber,
          );

      await ref
          .read(sessionStorageProvider)
          .saveSession(token: result.token, driver: result.driver);
      ref.read(socketServiceProvider).connect(result.token);

      state = state.copyWith(
        isLoading: false,
        hasBootstrapped: true,
        token: result.token,
        driver: result.driver,
      );
      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: error.toString(),
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      await ref.read(authRepositoryProvider).logout();
    } catch (_) {
      // Clearing the local session remains the priority.
    }

    await ref.read(sessionStorageProvider).clear();
    ref.read(socketServiceProvider).disconnect();

    state = const AuthState.initial().copyWith(hasBootstrapped: true);
  }

  Future<void> refreshDriver() async {
    try {
      final driver = await ref.read(authRepositoryProvider).fetchCurrentDriver();
      final token = state.token;

      if (token != null) {
        await ref.read(sessionStorageProvider).saveSession(token: token, driver: driver);
      }

      state = state.copyWith(driver: driver, clearError: true);
    } catch (_) {
      // Keep the current UI responsive even if a silent refresh fails.
    }
  }

  Future<void> updateDriverLocally(DriverProfile driver) async {
    final token = state.token;

    if (token != null) {
      await ref.read(sessionStorageProvider).saveSession(token: token, driver: driver);
    }

    state = state.copyWith(driver: driver);
  }
}
