import 'package:customer_app/shared/models/address_model.dart';
import 'package:customer_app/shared/models/driver_snapshot.dart';
import 'package:customer_app/shared/models/gas_product.dart';
import 'package:customer_app/shared/models/order_model.dart';
import 'package:customer_app/shared/models/order_status.dart';
import 'package:customer_app/shared/models/payment_method.dart';
import 'package:customer_app/shared/models/user_profile.dart';

class MockData {
  const MockData._();

  static const user = UserProfile(
    id: 'customer-001',
    fullName: 'سالم بن حمد الكندي',
    phone: '+96891234567',
    email: 'salim.kindi@omangas.app',
    defaultAddressId: 'addr-001',
  );

  static const addresses = [
    AddressModel(
      id: 'addr-001',
      label: 'المنزل',
      governorate: 'محافظة مسقط',
      wilayat: 'بوشر',
      area: 'الخوير',
      street: 'شارع 23',
      houseNumber: 'فيلا 118',
      landmark: 'بالقرب من مركز عمان أفينيوز',
      latitude: 23.5859,
      longitude: 58.4059,
      isDefault: true,
    ),
    AddressModel(
      id: 'addr-002',
      label: 'العمل',
      governorate: 'محافظة مسقط',
      wilayat: 'السيب',
      area: 'الموالح الجنوبية',
      street: 'المرحلة الرابعة',
      houseNumber: 'مبنى 14',
      landmark: 'خلف كلية الشرق الأوسط',
      latitude: 23.6220,
      longitude: 58.1894,
    ),
  ];

  static const gasProducts = [
    GasProduct(
      id: 'gas-001',
      nameAr: 'أسطوانة منزلية',
      nameEn: 'Home Cylinder',
      sizeLabel: '20L',
      priceOmr: 4.5,
      subtitleAr: 'مثالية للاستخدام اليومي داخل المنزل',
      subtitleEn: 'Ideal for everyday home use',
    ),
    GasProduct(
      id: 'gas-002',
      nameAr: 'أسطوانة تجارية',
      nameEn: 'Commercial Cylinder',
      sizeLabel: '35L',
      priceOmr: 7.25,
      subtitleAr: 'مناسبة للمطاعم والمخابز والمتاجر',
      subtitleEn: 'Suitable for restaurants and retail kitchens',
    ),
    GasProduct(
      id: 'gas-003',
      nameAr: 'أسطوانة احتياطية',
      nameEn: 'Reserve Cylinder',
      sizeLabel: '15L',
      priceOmr: 3.85,
      subtitleAr: 'خيار سريع للشقق والطلبات الصغيرة',
      subtitleEn: 'Fast option for apartments and smaller orders',
    ),
  ];

  static const assignedDriver = DriverSnapshot(
    id: 'driver-001',
    name: 'مازن البلوشي',
    phone: '+96892345678',
    vehicleLabel: 'Toyota Hilux',
    etaMinutes: 18,
  );

  static final orders = <OrderModel>[
    OrderModel(
      orderId: 'ORD-1029',
      customerId: user.id,
      customerName: user.fullName,
      phone: user.phone,
      gasProduct: gasProducts[0],
      quantity: 2,
      address: addresses[0],
      notes: 'يرجى الاتصال قبل الوصول بخمس دقائق.',
      paymentMethod: PaymentMethod.cashOnDelivery,
      orderStatus: OrderStatus.onTheWay,
      subtotalPrice: 9.0,
      deliveryFee: 1.25,
      totalPrice: 10.25,
      createdAt: DateTime(2026, 3, 21, 10, 20),
      updatedAt: DateTime(2026, 3, 21, 10, 48),
      driver: assignedDriver,
      driverLatitude: 23.5941,
      driverLongitude: 58.3911,
      preferredDeliveryWindow: 'خلال 30 دقيقة',
    ),
    OrderModel(
      orderId: 'ORD-1021',
      customerId: user.id,
      customerName: user.fullName,
      phone: user.phone,
      gasProduct: gasProducts[1],
      quantity: 1,
      address: addresses[1],
      notes: 'التسليم عبر الاستقبال الرئيسي.',
      paymentMethod: PaymentMethod.cashOnDelivery,
      orderStatus: OrderStatus.delivered,
      subtotalPrice: 7.25,
      deliveryFee: 1.5,
      totalPrice: 8.75,
      createdAt: DateTime(2026, 3, 19, 14, 5),
      updatedAt: DateTime(2026, 3, 19, 15, 4),
      preferredDeliveryWindow: 'بعد الظهر',
    ),
    OrderModel(
      orderId: 'ORD-1014',
      customerId: user.id,
      customerName: user.fullName,
      phone: user.phone,
      gasProduct: gasProducts[2],
      quantity: 3,
      address: addresses[0],
      notes: '',
      paymentMethod: PaymentMethod.digitalWallet,
      orderStatus: OrderStatus.pendingReview,
      subtotalPrice: 11.55,
      deliveryFee: 1.25,
      totalPrice: 12.8,
      createdAt: DateTime(2026, 3, 18, 20, 15),
      updatedAt: DateTime(2026, 3, 18, 20, 15),
      preferredDeliveryWindow: 'المساء',
    ),
  ];
}
