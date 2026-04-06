class DriverProfile {
  const DriverProfile({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.status,
    required this.availability,
    required this.currentLocation,
    required this.currentLatitude,
    required this.currentLongitude,
    required this.vehicleLabel,
    required this.licenseNumber,
    required this.lastSeenAt,
    required this.lastLocationAt,
  });

  final String id;
  final String name;
  final String phone;
  final String email;
  final String status;
  final String availability;
  final String currentLocation;
  final double? currentLatitude;
  final double? currentLongitude;
  final String vehicleLabel;
  final String licenseNumber;
  final DateTime? lastSeenAt;
  final DateTime? lastLocationAt;

  bool get isOnline => status == "online";
  bool get isBusy => availability == "busy";

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    double? parseCoordinate(dynamic value) {
      if (value == null || value == "") {
        return null;
      }

      return double.tryParse(value.toString());
    }

    DateTime? parseDate(dynamic value) {
      if (value == null || value == "") {
        return null;
      }

      return DateTime.tryParse(value.toString());
    }

    return DriverProfile(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      phone: (json["phone"] ?? "").toString(),
      email: (json["email"] ?? "").toString(),
      status: (json["status"] ?? "offline").toString(),
      availability: (json["availability"] ?? "available").toString(),
      currentLocation:
          (json["currentLocation"] ?? json["current_location"] ?? "")
              .toString(),
      currentLatitude: parseCoordinate(
        json["currentLatitude"] ?? json["current_latitude"],
      ),
      currentLongitude: parseCoordinate(
        json["currentLongitude"] ?? json["current_longitude"],
      ),
      vehicleLabel: (json["vehicleLabel"] ?? json["vehicle_label"] ?? "")
          .toString(),
      licenseNumber: (json["licenseNumber"] ?? json["license_number"] ?? "")
          .toString(),
      lastSeenAt: parseDate(json["lastSeenAt"] ?? json["last_seen_at"]),
      lastLocationAt: parseDate(
        json["lastLocationAt"] ?? json["last_location_at"],
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "name": name,
      "phone": phone,
      "email": email,
      "status": status,
      "availability": availability,
      "currentLocation": currentLocation,
      "currentLatitude": currentLatitude,
      "currentLongitude": currentLongitude,
      "vehicleLabel": vehicleLabel,
      "licenseNumber": licenseNumber,
      "lastSeenAt": lastSeenAt?.toIso8601String(),
      "lastLocationAt": lastLocationAt?.toIso8601String(),
    };
  }
}
