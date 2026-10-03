import 'package:flutter/material.dart';

class LocalizationService {
  static final Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'app_title': 'X-Space360',
      'welcome_back': 'Welcome back. Please sign in to continue.',
      'sign_in': 'Sign In',
      'sign_up': 'Sign Up',
      'dont_have_account': 'Don\'t have an account? Sign Up with OTP',
      'email': 'Email Address',
      'password': 'Password',
      'phone': 'Phone Number',
      'otp': 'OTP Code',
      'send_otp': 'Send OTP',
      'verify_otp': 'Verify OTP',
      'full_name': 'Full Name',
      'city': 'City',
      'register_as': 'Register As',
      'complete_registration': 'Complete Registration',
      'explore': 'Explore',
      'bookings': 'Bookings',
      'profile': 'Profile',
      'dashboard': 'Dashboard',
      'tasks': 'Tasks',
      'reviews': 'Reviews',
      'admin': 'Admin',
      'about_space': 'About this space',
      'amenities': 'Amenities',
      'select_stay_dates': 'Select Stay Dates',
      'instant_book': 'Instant Book',
      'confirm_pay': 'Confirm & Pay',
      'apply': 'Apply',
      'cancel_booking': 'Cancel Booking',
      'sign_out': 'Sign Out',
    },
    'hi': {
      'app_title': 'एक्स-स्पेस३६०',
      'welcome_back': 'वापसी पर आपका स्वागत है। जारी रखने के लिए साइन इन करें।',
      'sign_in': 'साइन इन करें',
      'sign_up': 'साइन अप करें',
      'dont_have_account': 'खाता नहीं है? ओटीपी के साथ साइन अप करें',
      'email': 'ईमेल पता',
      'password': 'पासवर्ड',
      'phone': 'फ़ोन नंबर',
      'otp': 'ओटीपी कोड',
      'send_otp': 'ओटीपी भेजें',
      'verify_otp': 'ओटीपी सत्यापित करें',
      'full_name': 'पूरा नाम',
      'city': 'शहर',
      'register_as': 'इस रूप में पंजीकरण करें',
      'complete_registration': 'पंजीकरण पूरा करें',
      'explore': 'खोजें',
      'bookings': 'बुकिंग',
      'profile': 'प्रोफ़ाइल',
      'dashboard': 'डैशबोर्ड',
      'tasks': 'कार्य',
      'reviews': 'समीक्षाएं',
      'admin': 'एडमिन',
      'about_space': 'इस जगह के बारे में',
      'amenities': 'सुविधाएं',
      'select_stay_dates': 'रहने की तारीखें चुनें',
      'instant_book': 'तुरंत बुक करें',
      'confirm_pay': 'पुष्टि करें और भुगतान करें',
      'apply': 'लागू करें',
      'cancel_booking': 'बुकिंग रद्द करें',
      'sign_out': 'साइन आउट',
    },
    'mr': {
      'app_title': 'एक्स-स्पेस३६०',
      'welcome_back': 'पुन्हा स्वागत आहे. सुरू ठेवण्यासाठी साइन इन करा.',
      'sign_in': 'साइन इन करा',
      'sign_up': 'साइन अप करा',
      'dont_have_account': 'खाते नाही? ओटीपीसह साइन अप करा',
      'email': 'ईमेल पत्ता',
      'password': 'पासवर्ड',
      'phone': 'फोन नंबर',
      'otp': 'ओटीपी कोड',
      'send_otp': 'ओटीपी पाठवा',
      'verify_otp': 'ओटीपी सत्यापित करा',
      'full_name': 'पूर्ण नाव',
      'city': 'शहर',
      'register_as': 'या रूपात नोंदणी करा',
      'complete_registration': 'नोंदणी पूर्ण करा',
      'explore': 'शोधा',
      'bookings': 'बुकिंग',
      'profile': 'प्रोफाइल',
      'dashboard': 'डॅशबोर्ड',
      'tasks': 'कार्ये',
      'reviews': 'समीक्षा',
      'admin': 'admin',
      'about_space': 'या जागेबद्दल',
      'amenities': 'सुविधा',
      'select_stay_dates': 'तारीख निवडा',
      'instant_book': 'त्वरित बुक करा',
      'confirm_pay': 'निश्चित करा आणि पैसे द्या',
      'apply': 'लागू करा',
      'cancel_booking': 'बुकिंग रद्द करा',
      'sign_out': 'साइन आउट करा',
    }
  };

  static String translate(String key, String locale) {
    if (!_localizedValues.containsKey(locale)) {
      locale = 'en';
    }
    return _localizedValues[locale]?[key] ?? key;
  }
}

class LocaleProvider with ChangeNotifier {
  String _currentLocale = 'en';

  String get currentLocale => _currentLocale;

  void setLocale(String locale) {
    if (['en', 'hi', 'mr'].contains(locale)) {
      _currentLocale = locale;
      notifyListeners();
    }
  }

  String translate(String key) {
    return LocalizationService.translate(key, _currentLocale);
  }
}
