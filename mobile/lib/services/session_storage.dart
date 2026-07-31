import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SessionStorage {
  SessionStorage._();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  static const _tokenKey = 'propnest_token';
  static const _userKey = 'propnest_user';

  static Future<String?> readToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } on MissingPluginException {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_tokenKey);
    }
  }

  static Future<void> writeToken(String token) async {
    try {
      await _storage.write(key: _tokenKey, value: token);
    } on MissingPluginException {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
    }
  }

  static Future<void> deleteToken() async {
    try {
      await _storage.delete(key: _tokenKey);
    } on MissingPluginException {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenKey);
    }
  }

  static Future<String?> readUser() async {
    try {
      return await _storage.read(key: _userKey);
    } on MissingPluginException {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_userKey);
    }
  }

  static Future<void> writeUser(String userJson) async {
    try {
      await _storage.write(key: _userKey, value: userJson);
    } on MissingPluginException {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userKey, userJson);
    }
  }

  static Future<void> deleteUser() async {
    try {
      await _storage.delete(key: _userKey);
    } on MissingPluginException {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_userKey);
    }
  }

  static Future<void> clearSession() async {
    await Future.wait([
      deleteToken(),
      deleteUser(),
    ]);
  }
}
