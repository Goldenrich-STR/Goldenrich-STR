import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/api_service.dart';
import '../../theme.dart';

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = false;
  String _currentLang = 'en';

  final Map<String, Map<String, dynamic>> _translations = {
    'en': {
      'welcome': "Namaste! 🙏 Welcome to X-Space360. My name is MAYUR. How can I help you find perfect stays or bootstrap your hosting business today?",
      'placeholder': "Ask MAYUR anything...",
      'status': "ONLINE & HEALTHY",
      'quick': [
        {'label': '🚀 Host Onboarding', 'query': 'Host onboarding and property listing steps'},
        {'label': '🏠 List Property', 'query': 'How to list a property as a host?'},
        {'label': '💼 Subscription Plans', 'query': 'What subscription plans do you offer?'},
        {'label': '📅 Refund Policy', 'query': 'How do bookings and refund policies work?'},
        {'label': '🔑 Physical Verification', 'query': 'What is physical verification process?'},
      ],
      'fallback': "I'm MAYUR, your X-Space360 helper. I can troubleshoot system issues, explain onboarding steps, verification procedures, or payouts. Feel free to ask!",
    },
    'hi': {
      'welcome': "नमस्ते! 🙏 एक्स-स्पेस३६० (X-Space360) में आपका स्वागत है। मेरा नाम MAYUR (मयूर) है। आज मैं आपकी बेहतरीन स्टे खोजने या आपके होस्टिंग व्यवसाय को बढ़ाने में कैसे मदद कर सकता हूँ?",
      'placeholder': "MAYUR से कुछ भी पूछें...",
      'status': "ऑनलाइन और सक्रिय",
      'quick': [
        {'label': '🚀 होस्ट ऑनबोर्डिंग', 'query': 'होस्ट ऑनबोर्डिंग और संपत्ति लिस्टिंग चरण'},
        {'label': '🏠 संपत्ति सूची', 'query': 'होस्ट के रूप में संपत्ति कैसे सूचीबद्ध करें?'},
        {'label': '💼 सदस्यता योजनाएं', 'query': 'आप कौन सी सदस्यता योजनाएं प्रदान करते हैं?'},
        {'label': '📅 रिफंड नीति', 'query': 'बुकिंग और रिफंड नीतियां कैसे काम करती हैं?'},
        {'label': '🔑 भौतिक सत्यापन', 'query': 'भौतिक सत्यापन प्रक्रिया क्या है?'},
      ],
      'fallback': "मैं MAYUR हूँ, आपका एक्स-स्पेस३६० सहायक। मैं सिस्टम समस्याओं को हल करने, ऑनबोर्डिंग चरणों और भुगतानों को समझाने में मदद कर सकता हूँ।",
    },
    'mr': {
      'welcome': "नमस्ते! 🙏 एक्स-स्पेस३६० (X-Space360) असिस्टंटमध्ये आपले स्वागत आहे. माझे नाव MAYUR (मयूर) आहे. आज मी आपल्याला सर्वोत्तम स्टे शोधण्यात किंवा आपला होस्टिंग व्यवसाय वाढवण्यास कशी मदत करू शकतो?",
      'placeholder': "MAYUR ला काहीही विचारा...",
      'status': "ऑनलाइन आणि सक्रिय",
      'quick': [
        {'label': '🚀 होस्ट ऑनबोर्डिंग', 'query': 'होस्ट ऑनबोर्डिंग आणि प्रॉपर्टी लिस्टिंग पायऱ्या'},
        {'label': '🏠 जागा लिस्ट करणे', 'query': 'होस्ट म्हणून जागा कशी लिस्ट करावी?'},
        {'label': '💼 सबस्क्रिप्शन प्लॅन्स', 'query': 'तुमचे सबस्क्रिप्शन प्लॅन्स कोणते आहेत?'},
        {'label': '📅 रिफंड पॉलिसी', 'query': 'बुकिंग आणि रिफंड पॉलिसी कशी काम करते?'},
        {'label': '🔑 व्हेरिफिकेशन', 'query': 'मॅपिंग आणि फिजिकल व्हेरिफिकेशन'},
      ],
      'fallback': "मी MAYUR आहे, तुमचा होस्ट सहाय्यक. मी सिस्टीम समस्या तपासणी, ऑनबोर्डिंग प्रक्रिया, फिजिकल व्हेरिफिकेशन आणि पेमेंटविषयी मदत करू शकतो.",
    }
  };

  @override
  void initState() {
    super.initState();
    // Add welcome message
    _messages.add({
      'text': _translations[_currentLang]!['welcome'],
      'isUser': false,
      'time': DateTime.now(),
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _addOfflineReply(String userQuery) {
    final lower = userQuery.toLowerCase();
    String reply = "";

    if (lower.contains("onboard") || lower.contains("listing flow") || lower.contains("पायऱ्या")) {
      reply = _currentLang == 'mr'
          ? "🚀 ऑनबोर्डिंग पायऱ्या:\n1. Host खाते नोंदणी करा.\n2. Standard/Growth/Elite प्लॅन निवडा.\n3. जागा लिस्ट करा (माहिती व फोटो अपलोड).\n4. फिजिकल व्हेरिफिकेशन पूर्ण करा.\n5. ग्रीन ट्रस्ट बॅजसह तुमची जागा लाईव्ह होईल!"
          : "🚀 Host Onboarding Flow:\n1. Register Host account.\n2. Choose a subscription plan.\n3. Complete listing form & upload photos.\n4. Undergo physical verification audit by Relationship Manager.\n5. Go Live with a green trust badge!";
    } else if (lower.contains("plan") || lower.contains("pricing") || lower.contains("सबस्क्रिप्शन") || lower.contains("योजना")) {
      reply = _currentLang == 'mr'
          ? "💼 सबस्क्रिप्शन प्लॅन्स:\n- Standard: एका प्रॉपर्टीसाठी (₹५०० नोंदणी शुल्क)\n- Growth: अनेक प्रॉपर्टीसाठी + प्राधान्य व्हेरिफिकेशन\n- Elite: स्वतंत्र RM + २४/७ सपोर्ट + होम रँकिंग"
          : "💼 Subscription Plans:\n- Standard: Ideal for 1 listing (₹500 refundable fee)\n- Growth: Multi-property support + priority audits\n- Elite: Dedicated Relationship Manager + 24/7 hotline + featured ranking";
    } else if (lower.contains("refund") || lower.contains("cancel") || lower.contains("रिफंड") || lower.contains("पॉलिसी")) {
      reply = _currentLang == 'mr'
          ? "📅 रिफंड पॉलिसी:\n- ७ दिवस आधी: १००% रिफंड\n- २ ते ७ दिवस आधी: ५०% रिफंड\n- ४८ तासांपेक्षा कमी: कोणताही रिफंड नाही"
          : "📅 Refund Policy:\n- 7+ days before check-in: 100% refund\n- 2 to 7 days before check-in: 50% refund\n- Less than 48 hours: Strict/no refund window applies";
    } else if (lower.contains("verify") || lower.contains("physical") || lower.contains("सत्यापन") || lower.contains("व्हेरिफिकेशन")) {
      reply = _currentLang == 'mr'
          ? "🔑 फिजिकल व्हेरिफिकेशन:\nआमचा प्रतिनिधी प्रत्यक्ष जागेला भेट देऊन दर्जा आणि भौगोलिक स्थान तपासतो. यामुळे ग्राहकांचा विश्वास वाढतो."
          : "🔑 Physical Verification:\nOur representative physically visits and audits your listed location to verify coordinates and quality, displaying a green trust badge on your listing.";
    } else if (lower.contains("hi") || lower.contains("hello") || lower.contains("namaste") || lower.contains("नमस्ते")) {
      reply = _currentLang == 'mr'
          ? "हॅलो! मी MAYUR आहे. सांगा, आज मी आपली काय मदत करू शकतो?"
          : "Hello! I am MAYUR. How can I assist you today?";
    } else {
      reply = _translations[_currentLang]!['fallback'];
    }

    setState(() {
      _messages.add({
        'text': reply,
        'isUser': false,
        'time': DateTime.now(),
      });
    });
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    setState(() {
      _messages.add({
        'text': text,
        'isUser': true,
        'time': DateTime.now(),
      });
      _isLoading = true;
    });

    _controller.clear();
    _scrollToBottom();

    try {
      final recent = _messages.length > 8 ? _messages.sublist(_messages.length - 8) : _messages;
      final history = recent.map((m) => {
        'role': m['isUser'] == true ? 'user' : 'model',
        'text': m['text'],
      }).toList();

      final response = await _apiService.dio.post(
        '/ai-calls/chat',
        data: {
          'message': text,
          'history': history,
        },
      );

      if (response.statusCode == 200) {
        final reply = response.data['response'] ?? '';
        
        if (reply.contains("running in offline mode") || reply.contains("connectivity issues")) {
          _addOfflineReply(text);
        } else {
          setState(() {
            _messages.add({
              'text': reply,
              'isUser': false,
              'time': DateTime.now(),
            });
          });
        }
      } else {
        _addOfflineReply(text);
      }
    } catch (e) {
      _addOfflineReply(text);
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    final trans = _translations[_currentLang]!;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppTheme.primary.withOpacity(0.1),
              child: const Text('M', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'MAYUR AI',
                  style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      trans['status'],
                      style: GoogleFonts.manrope(fontSize: 10, color: AppTheme.charcoalMuted, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          DropdownButton<String>(
            value: _currentLang,
            underline: Container(),
            icon: const Icon(Icons.language, color: AppTheme.primary),
            items: const [
              DropdownMenuItem(value: 'en', child: Text('EN')),
              DropdownMenuItem(value: 'hi', child: Text('HI')),
              DropdownMenuItem(value: 'mr', child: Text('MR')),
            ],
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _currentLang = val;
                });
              }
            },
          ),
          const SizedBox(width: 16),
        ],
        backgroundColor: Colors.transparent,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: Colors.grey[200], height: 1.0),
        ),
      ),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['isUser'];
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isUser ? AppTheme.primary : Colors.grey[100],
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: Radius.circular(isUser ? 16 : 0),
                        bottomRight: Radius.circular(isUser ? 0 : 16),
                      ),
                    ),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                    child: Text(
                      msg['text'],
                      style: GoogleFonts.manrope(
                        color: isUser ? Colors.white : AppTheme.charcoal,
                        fontSize: 13,
                        fontWeight: isUser ? FontWeight.w600 : FontWeight.w500,
                        height: 1.4,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Typing indicator
          if (_isLoading)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.start,
                children: [
                  const SizedBox(width: 16),
                  Text(
                    'MAYUR is typing...',
                    style: GoogleFonts.manrope(fontSize: 12, color: AppTheme.charcoalMuted, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),

          // Quick replies chips
          Container(
            height: 48,
            padding: const EdgeInsets.symmetric(vertical: 8),
            color: Colors.grey[50],
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: trans['quick'].length,
              itemBuilder: (context, index) {
                final item = trans['quick'][index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4.0),
                  child: ActionChip(
                    label: Text(
                      item['label'],
                      style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                    ),
                    backgroundColor: Colors.white,
                    side: BorderSide(color: Colors.grey[300]!),
                    onPressed: () {
                      _sendMessage(item['query']);
                    },
                  ),
                );
              },
            ),
          ),

          // Input field
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey[200]!)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: GoogleFonts.manrope(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: trans['placeholder'],
                      hintStyle: GoogleFonts.manrope(color: AppTheme.charcoalMuted, fontSize: 13),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      filled: true,
                      fillColor: Colors.grey[50],
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.send_rounded, color: AppTheme.primary),
                  onPressed: () => _sendMessage(_controller.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
