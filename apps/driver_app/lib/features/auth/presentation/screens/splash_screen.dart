import 'package:driver_app/app/app.dart';
import 'package:driver_app/features/auth/presentation/auth_controller.dart';
import 'package:driver_app/features/auth/presentation/screens/login_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(authControllerProvider.notifier).bootstrap();

      if (!mounted) {
        return;
      }

      _navigate();
    });
  }

  void _navigate() {
    if (_navigated) {
      return;
    }

    _navigated = true;
    final authState = ref.read(authControllerProvider);
    final target = authState.isAuthenticated
        ? const MainShellScreen()
        : const LoginScreen();

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => target),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF0D1732),
              Color(0xFF182B57),
              Color(0xFFFF7A1A),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const SafeArea(
          child: Padding(
            padding: EdgeInsets.all(28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 46,
                  backgroundColor: Colors.white24,
                  child: Icon(
                    Icons.local_shipping_rounded,
                    size: 42,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 26),
                Text(
                  'Oman Gas Driver',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 10),
                Text(
                  'Live delivery operations for gas cylinder drivers',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 15,
                  ),
                ),
                SizedBox(height: 32),
                CircularProgressIndicator(color: Colors.white),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
