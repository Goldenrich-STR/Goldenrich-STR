import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Simple sanity test', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: Text('X-Space360'),
      ),
    ));

    expect(find.text('X-Space360'), findsOneWidget);
  });
}
