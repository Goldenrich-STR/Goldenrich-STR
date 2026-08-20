import 'package:intl/intl.dart';

class AppCurrencyConfig {
  static const String defaultCurrencyCode = 'INR';
  static const String defaultLocale = 'en_IN';
  static const String defaultSymbol = '₹';
}

class CurrencyFormatter {
  static final NumberFormat _wholeInr = NumberFormat.currency(
    locale: AppCurrencyConfig.defaultLocale,
    symbol: AppCurrencyConfig.defaultSymbol,
    decimalDigits: 0,
  );

  static final NumberFormat _decimalInr = NumberFormat.currency(
    locale: AppCurrencyConfig.defaultLocale,
    symbol: AppCurrencyConfig.defaultSymbol,
    decimalDigits: 2,
  );

  static String format(
    num? amount, {
    String? currencyCode,
    bool signed = false,
  }) {
    final value = (amount ?? 0).toDouble();
    final code = (currencyCode ?? AppCurrencyConfig.defaultCurrencyCode)
        .trim()
        .toUpperCase();
    if (code != AppCurrencyConfig.defaultCurrencyCode) {
      throw ArgumentError('Unsupported currency: $code');
    }
    final absValue = value.abs();
    final hasPaise = absValue % 1 != 0;
    final formatted = (hasPaise ? _decimalInr : _wholeInr).format(absValue);
    if (value < 0 || signed) return '-$formatted';
    return formatted;
  }

  static String formatPaise(
    num? paise, {
    String? currencyCode,
    bool signed = false,
  }) {
    return format(
      (paise ?? 0) / 100,
      currencyCode: currencyCode,
      signed: signed,
    );
  }

  static int rupeesToPaise(num amount) => (amount * 100).round();
}
