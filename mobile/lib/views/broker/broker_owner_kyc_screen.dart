import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../services/api_service.dart';
import '../../theme.dart';

/// Host KYC for a broker's host: upload the documents, fill PAN / GST, sign the
/// agreement and submit for admin review. Same endpoints and rules as the
/// website's broker "Host Management > KYC" form
/// (`/broker/owner/{id}/kyc`, `.../kyc/documents/draft`, `.../kyc/agreement/draft`,
/// `.../submit-verification`).
class BrokerOwnerKycScreen extends StatefulWidget {
  final Map<String, dynamic> owner;

  const BrokerOwnerKycScreen({super.key, required this.owner});

  @override
  State<BrokerOwnerKycScreen> createState() => _BrokerOwnerKycScreenState();
}

class _Doc {
  final String type; // backend document_type
  final String draftKey; // key the draft endpoint maps (same as the website)
  final String label;
  final bool required;
  const _Doc(this.type, this.draftKey, this.label, this.required);
}

class _BrokerOwnerKycScreenState extends State<BrokerOwnerKycScreen> {
  static const _docs = [
    _Doc('aadhar_card', 'aadhar', 'Aadhaar', true),
    _Doc('property_proof', 'property', 'Property documents', true),
    _Doc('cancelled_cheque', 'cheque', 'Cancelled cheque', true),
    _Doc('shop_act', 'shop_act', 'Shop Act', true),
    _Doc('society_noc', 'society', 'Society NOC', false),
    _Doc('gst_certificate', 'gst', 'GST certificate', false),
  ];

  final _api = ApiService().dio;
  final _pan = TextEditingController();
  final _gst = TextEditingController();
  final _agreementName = TextEditingController();
  final _agreementAddress = TextEditingController();
  bool _loading = true;
  bool _submitting = false;
  bool _consent = false;
  String _kycStatus = 'unverified';
  String _remarks = '';
  List<Map<String, dynamic>> _kycDocs = [];
  String _signatureUrl = '';
  final Set<String> _busy = {};

  String get _ownerId => widget.owner['user_id'].toString();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pan.dispose();
    _gst.dispose();
    _agreementName.dispose();
    _agreementAddress.dispose();
    super.dispose();
  }

  void _toast(String text) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(text)));

  String _err(Object e, [String fallback = 'Something went wrong']) {
    if (e is DioException && e.response?.data is Map) {
      final d = e.response!.data['detail'];
      if (d != null) return d.toString();
    }
    return fallback;
  }

  Map<String, dynamic>? _doc(String type) {
    for (final d in _kycDocs) {
      if (d['document_type'] == type) return d;
    }
    return null;
  }

  Future<void> _load() async {
    try {
      final res = await _api.get('/broker/owner/$_ownerId/kyc');
      final data = Map<String, dynamic>.from(res.data as Map);
      _kycStatus = (data['kyc_status'] ?? 'unverified').toString();
      _remarks = (data['kyc_remarks'] ?? '').toString();
      _kycDocs = ((data['kyc_documents'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      final panDoc = _doc('pan_number');
      _pan.text =
          (panDoc?['text_value'] ?? data['pan_number'] ?? '').toString();
      final gstDoc = _doc('gst_number');
      _gst.text =
          (gstDoc?['text_value'] ?? data['gst_number'] ?? '').toString();
      _agreementName.text = (data['agreement_owner_name'] ??
              widget.owner['full_name'] ??
              '')
          .toString();
      _agreementAddress.text =
          (data['agreement_owner_address'] ?? '').toString();
      _signatureUrl = (data['agreement_signature'] ?? '').toString();
    } catch (e) {
      _toast(_err(e, 'Could not load KYC details'));
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<String?> _uploadBytes(Uint8List bytes, String filename) async {
    final form = FormData.fromMap(
        {'file': MultipartFile.fromBytes(bytes, filename: filename)});
    final res = await _api.post('/upload/document', data: form);
    return res.data['url']?.toString();
  }

  Future<void> _pickAndUpload(_Doc doc) async {
    final file = await ImagePicker()
        .pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    setState(() => _busy.add(doc.type));
    try {
      final url = await _uploadBytes(await file.readAsBytes(), file.name);
      if (url == null) throw Exception('No URL returned');
      await _api.patch('/broker/owner/$_ownerId/kyc/documents/draft',
          data: {'document_type': doc.draftKey, 'document_url': url});
      await _load();
    } catch (e) {
      _toast(_err(e, 'Upload failed. Please try again.'));
    }
    if (mounted) setState(() => _busy.remove(doc.type));
  }

  Future<void> _removeRejected(_Doc doc) async {
    setState(() => _busy.add(doc.type));
    try {
      await _api.delete(
          '/broker/owner/$_ownerId/kyc/documents/draft/${doc.draftKey}');
      await _load();
    } catch (e) {
      _toast(_err(e, 'Could not remove the document'));
    }
    if (mounted) setState(() => _busy.remove(doc.type));
  }

  static final _panRe = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$');
  String get _panValue {
    final v = _pan.text.trim().toUpperCase().replaceAll(RegExp(r'\s+'), '');
    const na = ['NA', 'N/A', 'NOTAPPLICABLE', 'NOT_APPLICABLE', 'NOT-APPLICABLE'];
    return na.contains(v) ? 'NOT_APPLICABLE' : v;
  }

  bool get _panValid => _panValue == 'NOT_APPLICABLE' || _panRe.hasMatch(_panValue);

  Future<void> _savePan() async {
    if (_panValue.isEmpty || !_panValid) return;
    try {
      await _api.patch('/broker/owner/$_ownerId/kyc/documents/draft',
          data: {'document_type': 'pan_number', 'text_value': _panValue});
    } catch (_) {}
  }

  Future<void> _sign() async {
    if (_agreementName.text.trim().isEmpty ||
        _agreementAddress.text.trim().isEmpty) {
      _toast('Enter the host name and address first');
      return;
    }
    final bytes = await showModalBottomSheet<Uint8List>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      builder: (_) => const _SignaturePad(),
    );
    if (bytes == null) return;
    setState(() => _busy.add('signature'));
    try {
      final url = await _uploadBytes(bytes, 'signature.png');
      if (url == null) throw Exception('No URL returned');
      await _api.patch('/broker/owner/$_ownerId/kyc/agreement/draft', data: {
        'agreement_owner_name': _agreementName.text.trim(),
        'agreement_owner_address': _agreementAddress.text.trim(),
        'agreement_signature': url,
      });
      setState(() => _signatureUrl = url);
      _toast('Agreement signed and saved');
    } catch (e) {
      _toast(_err(e, 'Could not save the signature'));
    }
    if (mounted) setState(() => _busy.remove('signature'));
  }

  String? _url(String type) {
    final u = _doc(type)?['document_url']?.toString() ?? '';
    return u.isEmpty ? null : u;
  }

  Future<void> _submit() async {
    final missing = [
      for (final d in _docs)
        if (d.required && _url(d.type) == null) d.label
    ];
    if (missing.isNotEmpty) {
      _toast('Upload: ${missing.join(', ')}');
      return;
    }
    if (_signatureUrl.isEmpty) {
      _toast('Sign the agreement first');
      return;
    }
    if (_panValue.isEmpty) {
      _toast('Enter the PAN number, or type NA if not applicable');
      return;
    }
    if (!_panValid) {
      _toast('Invalid PAN. Use the format ABCDE1234F, or NA');
      return;
    }
    if (!_consent) {
      _toast('Please accept the Terms & Conditions consent');
      return;
    }
    setState(() => _submitting = true);
    try {
      await _savePan();
      if (_gst.text.trim().isNotEmpty) {
        await _api.patch('/broker/owner/$_ownerId/kyc/documents/draft', data: {
          'document_type': 'gst_number',
          'text_value': _gst.text.trim()
        });
      }
      await _api.post('/broker/owner/$_ownerId/submit-verification', data: {
        'aadhar_card': _url('aadhar_card'),
        'pan_number': _panValue,
        'property_proof': _url('property_proof'),
        'cancelled_cheque': _url('cancelled_cheque'),
        'society_noc': _url('society_noc'),
        'shop_act': _url('shop_act'),
        'gst_certificate': _url('gst_certificate'),
        'gst_number': _gst.text.trim().isEmpty ? null : _gst.text.trim(),
        'agreement_owner_name': _agreementName.text.trim(),
        'agreement_owner_address': _agreementAddress.text.trim(),
        'agreement_signature': _signatureUrl,
        'terms_accepted': true,
        'terms_version': 'host-verification-2026-06',
      });
      if (!mounted) return;
      _toast('KYC submitted for admin review');
      Navigator.pop(context, true);
    } catch (e) {
      _toast(_err(e, 'Submission failed'));
    }
    if (mounted) setState(() => _submitting = false);
  }

  Color _statusColor(String s) => s == 'approved'
      ? Colors.green.shade700
      : s == 'rejected'
          ? Colors.red.shade700
          : Colors.orange.shade800;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text('KYC: ${widget.owner['full_name'] ?? 'Host'}'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(children: [
                  const Text('KYC status: ',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  Text(_kycStatus.toUpperCase(),
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: _statusColor(_kycStatus))),
                ]),
                if (_remarks.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text('Admin remarks: $_remarks',
                        style: TextStyle(color: Colors.red.shade700)),
                  ),
                const SizedBox(height: 14),
                for (final d in _docs) _docTile(d),
                const SizedBox(height: 8),
                TextField(
                  controller: _pan,
                  textCapitalization: TextCapitalization.characters,
                  onEditingComplete: _savePan,
                  decoration: const InputDecoration(
                      labelText: 'PAN number *',
                      helperText: 'ABCDE1234F, or type NA if not applicable',
                      border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _gst,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                      labelText: 'GST number (optional)',
                      border: OutlineInputBorder()),
                ),
                const SizedBox(height: 18),
                const Text('Agreement',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                TextField(
                  controller: _agreementName,
                  decoration: const InputDecoration(
                      labelText: 'Host name *', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _agreementAddress,
                  maxLines: 2,
                  decoration: const InputDecoration(
                      labelText: 'Host address *',
                      border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _busy.contains('signature') ? null : _sign,
                  icon: Icon(_signatureUrl.isEmpty
                      ? Icons.draw_outlined
                      : Icons.check_circle,
                      color: _signatureUrl.isEmpty ? null : Colors.green),
                  label: Text(_signatureUrl.isEmpty
                      ? 'Sign the agreement'
                      : 'Signed. Tap to sign again'),
                ),
                const SizedBox(height: 14),
                CheckboxListTile(
                  value: _consent,
                  onChanged: (v) => setState(() => _consent = v ?? false),
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  title: const Text(
                      'The host has agreed to the Terms & Conditions for host verification.',
                      style: TextStyle(fontSize: 13)),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: Text(_submitting
                        ? 'Submitting...'
                        : 'Submit for admin review'),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Widget _docTile(_Doc d) {
    final doc = _doc(d.type);
    final status = (doc?['status'] ?? '').toString();
    final has = _url(d.type) != null;
    final rejected = status == 'rejected';
    final busy = _busy.contains(d.type);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Text('${d.label}${d.required ? ' *' : ''}',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
            if (has)
              Text(status.isEmpty ? 'UPLOADED' : status.toUpperCase(),
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: _statusColor(status))),
          ]),
          if (rejected && (doc?['rejection_reason'] ?? '').toString().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Rejected: ${doc!['rejection_reason']}',
                  style: TextStyle(fontSize: 12, color: Colors.red.shade700)),
            ),
          const SizedBox(height: 8),
          Row(children: [
            OutlinedButton.icon(
              onPressed: busy || (has && !rejected && _kycStatus == 'approved')
                  ? null
                  : () => _pickAndUpload(d),
              icon: busy
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.upload_file, size: 18),
              label: Text(has ? 'Replace' : 'Upload'),
            ),
            if (rejected) ...[
              const SizedBox(width: 8),
              TextButton(
                  onPressed: busy ? null : () => _removeRejected(d),
                  child: const Text('Remove')),
            ],
          ]),
        ],
      ),
    );
  }
}

/// Finger signature pad. Pops the signature as PNG bytes.
class _SignaturePad extends StatefulWidget {
  const _SignaturePad();

  @override
  State<_SignaturePad> createState() => _SignaturePadState();
}

class _SignaturePadState extends State<_SignaturePad> {
  final List<List<Offset>> _strokes = [];

  Future<Uint8List?> _export(Size size) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawRect(Offset.zero & size, Paint()..color = Colors.white);
    _paintStrokes(canvas);
    final image = await recorder
        .endRecording()
        .toImage(size.width.round(), size.height.round());
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    return data?.buffer.asUint8List();
  }

  void _paintStrokes(Canvas canvas) {
    final paint = Paint()
      ..color = const Color(0xFF1F2937)
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;
    for (final s in _strokes) {
      if (s.length == 1) {
        canvas.drawCircle(s.first, 1.5, paint..style = PaintingStyle.fill);
        paint.style = PaintingStyle.stroke;
      }
      for (var i = 1; i < s.length; i++) {
        canvas.drawLine(s[i - 1], s[i], paint);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const size = Size(340, 180);
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Sign with your finger',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Container(
            width: size.width,
            height: size.height,
            decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade400),
                borderRadius: BorderRadius.circular(8)),
            child: GestureDetector(
              onPanStart: (d) =>
                  setState(() => _strokes.add([d.localPosition])),
              onPanUpdate: (d) =>
                  setState(() => _strokes.last.add(d.localPosition)),
              child: CustomPaint(painter: _PadPainter(_strokes, _paintStrokes)),
            ),
          ),
          const SizedBox(height: 12),
          Row(children: [
            TextButton(
                onPressed: () => setState(_strokes.clear),
                child: const Text('Clear')),
            const Spacer(),
            ElevatedButton(
              onPressed: () async {
                if (_strokes.isEmpty) return;
                final bytes = await _export(size);
                if (context.mounted) Navigator.pop(context, bytes);
              },
              child: const Text('Save signature'),
            ),
          ]),
          SizedBox(height: MediaQuery.viewInsetsOf(context).bottom),
        ],
      ),
    );
  }
}

class _PadPainter extends CustomPainter {
  final List<List<Offset>> strokes;
  final void Function(Canvas) draw;
  _PadPainter(this.strokes, this.draw);

  @override
  void paint(Canvas canvas, Size size) => draw(canvas);

  @override
  bool shouldRepaint(covariant _PadPainter old) => true;
}
