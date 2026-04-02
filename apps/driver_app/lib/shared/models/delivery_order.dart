class DeliveryOrder {
  const DeliveryOrder({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.customerEmail,
    required this.location,
    required this.addressFull,
    required this.gasType,
    required this.quantity,
    required this.paymentMethod,
    required this.notes,
    required this.preferredDeliveryWindow,
    required this.totalAmount,
    required this.status,
    required this.driverStage,
    required this.assignedDriverId,
    required this.driverName,
    required this.driverPhone,
    required this.driverLocation,
    required this.driverLatitude,
    required this.driverLongitude,
    required this.customerLatitude,
    required this.customerLongitude,
    required this.createdAt,
    required this.updatedAt,
    required this.acceptedAt,
    required this.deliveredAt,
    required this.cancelledAt,
  });

  final String id;
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final String customerEmail;
  final String location;
  final String addressFull;
  final String gasType;
  final int quantity;
  final String paymentMethod;
  final String notes;
  final String preferredDeliveryWindow;
  final double totalAmount;
  final String status;
  final String driverStage;
  final String? assignedDriverId;
  final String driverName;
  final String driverPhone;
  final String driverLocation;
  final double? driverLatitude;
  final double? driverLongitude;
  final double? customerLatitude;
  final double? customerLongitude;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? acceptedAt;
  final DateTime? deliveredAt;
  final DateTime? cancelledAt;

  bool get isAvailable => status == "pending";
  bool get isActive =>
      status == "accepted" &&
      const {"accepted", "on_the_way", "arrived"}.contains(driverStage);
  bool get isCompleted => status == "delivered";
  bool get isCancelled => status == "cancelled";

  factory DeliveryOrder.fromJson(Map<String, dynamic> json) {
    double? parseCoordinate(dynamic value) {
      if (value == null || value == "") {
        return null;
      }

      return double.tryParse(value.toString());
    }

    double parseAmount(dynamic value) {
      if (value == null || value == "") {
        return 0;
      }

      return double.tryParse(value.toString()) ?? 0;
    }

    int parseQuantity(dynamic value) {
      if (value == null || value == "") {
        return 1;
      }

      return int.tryParse(value.toString()) ?? 1;
    }

    DateTime? parseDate(dynamic value) {
      if (value == null || value == "") {
        return null;
      }

      return DateTime.tryParse(value.toString());
    }

    return DeliveryOrder(
      id: (json["id"] ?? "").toString(),
      customerId: json["customerId"]?.toString() ?? json["customer_id"]?.toString(),
      customerName: (json["customerFullName"] ??
              json["customer_full_name"] ??
              json["name"] ??
              "")
          .toString(),
      customerPhone: (json["phone"] ?? "").toString(),
      customerEmail: (json["customerEmail"] ?? json["customer_email"] ?? "")
          .toString(),
      location: (json["location"] ?? "").toString(),
      addressFull:
          (json["addressFull"] ?? json["address_full"] ?? json["location"] ?? "")
              .toString(),
      gasType: (json["gasType"] ?? json["gas_type"] ?? "").toString(),
      quantity: parseQuantity(json["quantity"]),
      paymentMethod:
          (json["paymentMethod"] ?? json["payment_method"] ?? "cash_on_delivery")
              .toString(),
      notes: (json["notes"] ?? "").toString(),
      preferredDeliveryWindow:
          (json["preferredDeliveryWindow"] ?? json["preferred_delivery_window"] ?? "")
              .toString(),
      totalAmount: parseAmount(json["totalAmount"] ?? json["total_amount"]),
      status: (json["status"] ?? "pending").toString(),
      driverStage:
          (json["driverStage"] ?? json["driver_stage"] ?? "new_order").toString(),
      assignedDriverId:
          json["assignedDriverId"]?.toString() ?? json["assigned_driver_id"]?.toString(),
      driverName: (json["driverName"] ?? json["driver_name"] ?? "").toString(),
      driverPhone:
          (json["driverPhone"] ?? json["driver_phone"] ?? "").toString(),
      driverLocation:
          (json["driverLocation"] ?? json["driver_location"] ?? "").toString(),
      driverLatitude:
          parseCoordinate(json["driverLatitude"] ?? json["driver_latitude"]),
      driverLongitude:
          parseCoordinate(json["driverLongitude"] ?? json["driver_longitude"]),
      customerLatitude:
          parseCoordinate(json["customerLatitude"] ?? json["customer_latitude"]),
      customerLongitude:
          parseCoordinate(json["customerLongitude"] ?? json["customer_longitude"]),
      createdAt: parseDate(json["createdAt"] ?? json["created_at"]),
      updatedAt: parseDate(json["updatedAt"] ?? json["updated_at"]),
      acceptedAt: parseDate(json["acceptedAt"] ?? json["accepted_at"]),
      deliveredAt: parseDate(json["deliveredAt"] ?? json["delivered_at"]),
      cancelledAt: parseDate(json["cancelledAt"] ?? json["cancelled_at"]),
    );
  }
}
