import 'package:intl/intl.dart';

class Formatters {
  Formatters._();

  static final _currency = NumberFormat.currency(
    locale: 'ar_OM',
    symbol: 'ر.ع',
    decimalDigits: 3,
  );

  static final _compactDate = DateFormat('dd MMM, hh:mm a');
  static final _shortTime = DateFormat('hh:mm a');

  static String currency(num value) => _currency.format(value);

  static String dateTime(DateTime? value) {
    if (value == null) {
      return 'غير متاح';
    }

    return _compactDate.format(value.toLocal());
  }

  static String time(DateTime? value) {
    if (value == null) {
      return '--:--';
    }

    return _shortTime.format(value.toLocal());
  }

  static String paymentMethod(String value) {
    switch (value) {
      case 'cash_on_delivery':
        return 'Cash on delivery';
      case 'card':
        return 'Card';
      default:
        return value.replaceAll('_', ' ');
    }
  }

  static String driverStage(String value) {
    switch (value) {
      case 'new_order':
        return 'New order';
      case 'accepted':
        return 'Accepted';
      case 'on_the_way':
        return 'On the way';
      case 'arrived':
        return 'Arrived';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return value;
    }
  }
}
