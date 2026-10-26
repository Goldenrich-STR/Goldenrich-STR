import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goldenrich_str_mobile/views/shared/property_image.dart';

void main() {
  for (final size in [const Size(160, 80), const Size(80, 40)]) {
    testWidgets('Missing property image fits a $size card at large text scale',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: Center(
              child: SizedBox.fromSize(
                size: size,
                child: const PropertyImage(imageUrl: null),
              ),
            ),
          ),
        ),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Property image unavailable'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
