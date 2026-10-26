import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goldenrich_str_mobile/providers/auth_provider.dart';

void main() {
  late Dio dio;
  late AuthProvider auth;
  setUp(() {
    dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
    auth = AuthProvider(dio: dio);
  });
  tearDown(() {
    auth.dispose();
    dio.close();
  });

  test(
    'OTP validity follows the server instead of a fixed two minutes',
    () async {
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            expect(options.path, '/api/auth/send-otp');
            expect(options.data['phone'], '9876543210');
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'expires_in': 300, 'demo_mode': false},
              ),
            );
          },
        ),
      );
      expect(await auth.sendOTP(' 9876543210 '), isTrue);
      expect(auth.otpSecondsRemaining, inInclusiveRange(299, 300));
      expect(auth.isLoading, isFalse);
    },
  );

  test(
    'Expired and locked OTP responses retain the server explanation',
    () async {
      for (final status in [410, 429]) {
        const message = 'Request a new OTP before trying again.';
        dio.interceptors.clear();
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  type: DioExceptionType.badResponse,
                  response: Response(
                    requestOptions: options,
                    statusCode: status,
                    data: {'detail': message},
                  ),
                ),
              );
            },
          ),
        );
        expect(await auth.verifyOTP('9876543210', '123456'), isFalse);
        expect(auth.lastError, message);
        expect(auth.isLoading, isFalse);
      }
    },
  );

  test('HTTP 200 without verification cannot advance registration', () async {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.resolve(
            Response(
              requestOptions: options,
              statusCode: 200,
              data: {'verified': false},
            ),
          );
        },
      ),
    );
    expect(await auth.verifyOTP('9876543210', '123456'), isFalse);
    expect(auth.lastError, isNotNull);
  });

  test(
    'Successful verification clears previous errors and OTP validity',
    () async {
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'verified': true},
              ),
            );
          },
        ),
      );
      expect(await auth.verifyOTP('9876543210', ' 123456 '), isTrue);
      expect(auth.lastError, isNull);
      expect(auth.otpSecondsRemaining, 0);
    },
  );
}
