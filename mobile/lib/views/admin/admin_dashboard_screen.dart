import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart' as dio_pkg;
import 'package:dio/dio.dart' show MultipartFile, FormData;
import '../../providers/verification_provider.dart';
import '../../providers/account_provider.dart';
import '../../providers/admin_provider.dart';
import '../../services/api_service.dart';
import '../../config.dart';
import '../../theme.dart';
import '../guest/property_detail_screen.dart';
import '../host/host_list_property_screen.dart';
import '../employee/verification_report_screen.dart';
import '../../models/property_model.dart';
import '../../providers/property_provider.dart';


class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _remarksController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  // User search/filter state
  final _searchController = TextEditingController();
  String _selectedRole = 'All';

  // Property search/filter state
  final _propertySearchController = TextEditingController();
  String _selectedPropertyFilter = 'awaiting_approval';

  // Booking search/filter state
  final _bookingSearchController = TextEditingController();
  String _selectedBookingFilter = 'all';
  
  // Local state for inner tab in AI Voice Calls (0: Call Logs, 1: Voice Agents)
  int _aiInnerTab = 0;

  // Local state for CMS Sub-tabs (0: Hero Details, 1: How It Works, 2: Testimonials, 3: Blog Posts, 4: Footer)
  int _cmsSubTab = 0;

  // CMS Hero Details Form Controllers
  final _cmsSubTagController = TextEditingController();
  final _cmsRatingController = TextEditingController();
  final _cmsTitleController = TextEditingController();
  final _cmsSubtitleController = TextEditingController();
  final _cmsTrustedController = TextEditingController();
  final _cmsImageController = TextEditingController();
  bool _cmsControllersInitialized = false;
  bool _cmsUploadingImage = false;

  // CMS Lists
  List<dynamic>? _cmsStepsList;
  List<dynamic>? _cmsTestimonialsList;
  List<dynamic>? _cmsBlogsList;

  // CMS Footer Controllers
  final _footerDescCtrl = TextEditingController();
  final _footerLocCtrl = TextEditingController();
  final _footerEmailCtrl = TextEditingController();
  final _footerPhoneCtrl = TextEditingController();
  final _footerGrievanceTitleCtrl = TextEditingController();
  final _footerOfficerNameCtrl = TextEditingController();
  final _footerOfficerEmailCtrl = TextEditingController();
  final _footerOfficerPhoneCtrl = TextEditingController();
  final _footerResolutionTextCtrl = TextEditingController();
  final _footerTermsCtrl = TextEditingController();
  final _footerPrivacyCtrl = TextEditingController();
  final _footerCheckinCtrl = TextEditingController();
  bool _footerInitialized = false;
  int _accountSubTab = 0;

  // CMS Offer Controllers
  final _cmsOfferTitleController = TextEditingController();
  final _cmsOfferDescController = TextEditingController();
  final _cmsOfferButtonTextController = TextEditingController();
  final _cmsOfferImageController = TextEditingController();
  bool _cmsOfferIsEnabled = true;
  bool _cmsOfferControllersInitialized = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 10, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final verificationProv = Provider.of<VerificationProvider>(context, listen: false);
    final accountProv = Provider.of<AccountProvider>(context, listen: false);
    final adminProv = Provider.of<AdminProvider>(context, listen: false);
    
    setState(() {
      _cmsStepsList = null;
      _cmsTestimonialsList = null;
      _cmsBlogsList = null;
      _cmsControllersInitialized = false;
      _footerInitialized = false;
    });

    verificationProv.getAwaitingFinalApprovals(filter: _selectedPropertyFilter);
    accountProv.getOverview();
    accountProv.getTransactions({});
    accountProv.getPayouts({});
    accountProv.getMrrChartData();
    accountProv.getTopHosts();
    adminProv.getDashboardStats();
    adminProv.getUsers(role: _selectedRole, search: _searchController.text);
    
    // Fetch remaining admin dashboard data
    adminProv.getBookings(statusFilter: _selectedBookingFilter);
    adminProv.getSubscriptionPlans();
    adminProv.getCMSContent();
    adminProv.getCoupons();
    adminProv.getSearchLogs();
    adminProv.getAICalls();
    adminProv.getAIAgents();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _remarksController.dispose();
    _searchController.dispose();
    _cmsOfferTitleController.dispose();
    _cmsOfferDescController.dispose();
    _cmsOfferButtonTextController.dispose();
    _cmsOfferImageController.dispose();
    super.dispose();
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateStr.toString()).toLocal();
      return DateFormat('d MMM yyyy, hh:mm a').format(dt);
    } catch (_) {
      return dateStr.toString();
    }
  }

  void _showCreatePlanDialog() {
    final nameCtrl = TextEditingController();
    final monthlyPriceCtrl = TextEditingController();
    final annualPriceCtrl = TextEditingController();
    final sqftRangeCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String selectedPlanType = 'studio';
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Create New Subscription Plan',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                      const Divider(height: 20),
                      TextFormField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Plan Name',
                          hintText: 'e.g. Starter Studio Plan',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Please enter plan name' : null,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: selectedPlanType,
                        decoration: const InputDecoration(
                          labelText: 'Plan Type (BHK Config)',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'studio', child: Text('Studio Apartment')),
                          DropdownMenuItem(value: '1bhk', child: Text('1 BHK')),
                          DropdownMenuItem(value: '2bhk', child: Text('2 BHK')),
                          DropdownMenuItem(value: '3bhk', child: Text('3 BHK')),
                          DropdownMenuItem(value: '4bhk', child: Text('4 BHK')),
                          DropdownMenuItem(value: '4bhk_plus', child: Text('4 BHK+')),
                          DropdownMenuItem(value: 'commercial', child: Text('Commercial Space')),
                          DropdownMenuItem(value: 'banquet', child: Text('Banquet Hall')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              selectedPlanType = val;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: sqftRangeCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Sq.ft Range (Optional)',
                          hintText: 'e.g. <500, 500-2000, 5000+',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: monthlyPriceCtrl,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Monthly Price (₹)',
                                hintText: 'e.g. 999',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) return 'Required';
                                if (double.tryParse(value) == null) return 'Invalid number';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              controller: annualPriceCtrl,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Annual Price (₹)',
                                hintText: 'e.g. 9999',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) return 'Required';
                                if (double.tryParse(value) == null) return 'Invalid number';
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: descCtrl,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          hintText: 'Describe features (e.g. 3 Months Free Trial, featured listings)',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) => value == null || value.trim().isEmpty ? 'Please enter description' : null,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () async {
                          if (formKey.currentState!.validate()) {
                            final payload = {
                              'plan_name': nameCtrl.text.trim(),
                              'plan_type': selectedPlanType,
                              'price_monthly': double.parse(monthlyPriceCtrl.text.trim()),
                              'price_annual': double.parse(annualPriceCtrl.text.trim()),
                              'description': descCtrl.text.trim(),
                              'sqft_range': sqftRangeCtrl.text.trim().isEmpty ? null : sqftRangeCtrl.text.trim(),
                            };
                            
                            final success = await Provider.of<AdminProvider>(context, listen: false)
                                .createSubscriptionPlan(payload);
                                
                            if (context.mounted) {
                              if (success) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Subscription plan created successfully!'), backgroundColor: Colors.green),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Failed to create subscription plan.'), backgroundColor: Colors.red),
                                );
                              }
                            }
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Create Plan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _pickAndUploadImageForCms(Function(String) onUrlUploaded) async {
    final picker = ImagePicker();
    try {
      final XFile? file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
      if (file != null) {
        setState(() {
          _cmsUploadingImage = true;
        });
        final apiService = ApiService();
        final formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(file.path, filename: file.name),
        });
        final response = await apiService.dio.post('/upload/image', data: formData);
        if (response.statusCode == 200 || response.statusCode == 201) {
          final url = response.data['url'] ?? '';
          if (url.isNotEmpty) {
            onUrlUploaded(url);
          }
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('CMS image uploaded successfully!'), backgroundColor: Colors.green),
          );
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upload failed: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() {
        _cmsUploadingImage = false;
      });
    }
  }

  Future<void> _pickAndUploadCMSImage() async {
    await _pickAndUploadImageForCms((url) {
      setState(() {
        _cmsImageController.text = url;
      });
    });
  }

  Future<void> _saveHeroConfiguration(String contentId) async {
    final payload = {
      'sub_tag': _cmsSubTagController.text,
      'rating': _cmsRatingController.text,
      'title': _cmsTitleController.text,
      'subtitle': _cmsSubtitleController.text,
      'trusted_text': _cmsTrustedController.text,
      'image_url': _cmsImageController.text,
    };
    final success = await Provider.of<AdminProvider>(context, listen: false)
        .updateCMSContent(contentId, payload);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hero Configuration saved successfully!'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save Hero Configuration.'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _saveHowItWorksConfiguration(String contentId) async {
    if (_cmsStepsList == null) return;
    final payload = {
      'steps': _cmsStepsList,
    };
    final success = await Provider.of<AdminProvider>(context, listen: false)
        .updateCMSContent(contentId, payload);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('How It Works Steps saved successfully!'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save Steps Configuration.'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _saveTestimonialsConfiguration(String contentId) async {
    if (_cmsTestimonialsList == null) return;
    final payload = {
      'items': _cmsTestimonialsList,
      'testimonials': _cmsTestimonialsList,
    };
    final success = await Provider.of<AdminProvider>(context, listen: false)
        .updateCMSContent(contentId, payload);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Testimonials saved successfully!'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save Testimonials Configuration.'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _saveBlogsConfiguration(String contentId) async {
    if (_cmsBlogsList == null) return;
    final payload = {
      'posts': _cmsBlogsList,
    };
    final success = await Provider.of<AdminProvider>(context, listen: false)
        .updateCMSContent(contentId, payload);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Blog Posts saved successfully!'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save Blog Posts Configuration.'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _saveFooterConfiguration(String contentId) async {
    final payload = {
      'brand_description': _footerDescCtrl.text,
      'location': _footerLocCtrl.text,
      'email': _footerEmailCtrl.text,
      'phone': _footerPhoneCtrl.text,
      'grievance_title': _footerGrievanceTitleCtrl.text,
      'grievance_officer': _footerOfficerNameCtrl.text,
      'grievance_email': _footerOfficerEmailCtrl.text,
      'grievance_phone': _footerOfficerPhoneCtrl.text,
      'resolution_text': _footerResolutionTextCtrl.text,
      'terms_text': _footerTermsCtrl.text,
      'privacy_text': _footerPrivacyCtrl.text,
      'checkin_text': _footerCheckinCtrl.text,
    };
    final success = await Provider.of<AdminProvider>(context, listen: false)
        .updateCMSContent(contentId, payload);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Footer Configuration saved successfully!'), backgroundColor: Colors.green),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save Footer Configuration.'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _buildCmsChip(String label, int index) {
    final isSelected = _cmsSubTab == index;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isSelected ? Colors.white : AppTheme.charcoalMuted,
        ),
      ),
      selected: isSelected,
      selectedColor: AppTheme.primary,
      backgroundColor: Colors.grey.shade100,
      onSelected: (val) {
        setState(() {
          _cmsSubTab = index;
        });
      },
    );
  }

  Widget _buildCmsSubTabContent(AdminProvider adminProvider) {
    if (adminProvider.cmsContent.isEmpty) {
      return const Center(child: Text('No CMS Content loaded.'));
    }

    switch (_cmsSubTab) {
      case 0:
        return _buildCmsHeroDetailsForm(adminProvider);
      case 1:
        return _buildCmsHowItWorksList(adminProvider);
      case 2:
        return _buildCmsTestimonialsList(adminProvider);
      case 3:
        return _buildCmsBlogPostsList(adminProvider);
      case 4:
        return _buildCmsFooterConfig(adminProvider);
      case 5:
        return _buildCmsOfferConfig(adminProvider);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildCmsOfferConfig(AdminProvider adminProvider) {
    final offerCms = adminProvider.cmsContent.firstWhere(
      (c) => c['section'] == 'offer',
      orElse: () => null,
    );
    
    if (offerCms == null) {
      return Card(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppTheme.stone),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              const Text(
                'Offer configuration not found in CMS data. Click below to initialize the default promotional offer.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () async {
                  final payload = {
                    'is_enabled': true,
                    'title': 'Save 10% on a summertime trip',
                    'description': 'Book within 7 days and save up to \$100 on your next stay. Terms apply.',
                    'button_text': 'Log in to claim offer',
                    'image_url': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600',
                  };
                  try {
                    await ApiService().dio.post('/cms/admin/content', data: {
                      'page': 'landing',
                      'section': 'offer',
                      'content_type': 'object',
                      'content_data': payload,
                    });
                    await adminProvider.getCMSContent();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Offer initialized successfully!'), backgroundColor: Colors.green),
                    );
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Failed to initialize offer: $e'), backgroundColor: Colors.red),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                child: const Text('Initialize Offer CMS', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    final contentId = offerCms['content_id'];

    if (!_cmsOfferControllersInitialized) {
      final data = offerCms['content_data'] ?? {};
      _cmsOfferTitleController.text = data['title'] ?? 'Save 10% on a summertime trip';
      _cmsOfferDescController.text = data['description'] ?? 'Book within 7 days and save up to \$100 on your next stay. Terms apply.';
      _cmsOfferButtonTextController.text = data['button_text'] ?? 'Log in to claim offer';
      _cmsOfferImageController.text = data['image_url'] ?? '';
      _cmsOfferIsEnabled = data['is_enabled'] ?? true;
      _cmsOfferControllersInitialized = true;
    }

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.stone),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.local_offer_outlined, color: AppTheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Promotional Offer Popup Config',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Configure the popup offer shown on the landing page.',
                        style: TextStyle(fontSize: 10, color: AppTheme.charcoalMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            
            // Enable / Disable Switch
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'ENABLE OFFER POPUP',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
                ),
                Switch(
                  value: _cmsOfferIsEnabled,
                  activeColor: AppTheme.primary,
                  onChanged: (val) {
                    setState(() {
                      _cmsOfferIsEnabled = val;
                    });
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Title
            const Text('OFFER TITLE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsOfferTitleController,
              decoration: const InputDecoration(
                hintText: 'e.g. Save 10% on a summertime trip',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 16),

            // Description
            const Text('OFFER DESCRIPTION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsOfferDescController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'e.g. Book within 7 days and save up to \$100...',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 16),

            // Button Text
            const Text('BUTTON TEXT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsOfferButtonTextController,
              decoration: const InputDecoration(
                hintText: 'e.g. Log in to claim offer',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 16),

            // Offer Image URL
            const Text('OFFER IMAGE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _cmsOfferImageController,
                    decoration: const InputDecoration(
                      hintText: 'Image URL',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _cmsUploadingImage
                      ? null
                      : () async {
                          await _pickAndUploadImageForCms((url) {
                            setState(() {
                              _cmsOfferImageController.text = url;
                            });
                          });
                        },
                  icon: _cmsUploadingImage
                      ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.upload, size: 14, color: Colors.white),
                  label: const Text('Upload', style: TextStyle(color: Colors.white, fontSize: 11)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    minimumSize: const Size(80, 40),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Save button
            ElevatedButton.icon(
              onPressed: () async {
                final payload = {
                  'is_enabled': _cmsOfferIsEnabled,
                  'title': _cmsOfferTitleController.text,
                  'description': _cmsOfferDescController.text,
                  'button_text': _cmsOfferButtonTextController.text,
                  'image_url': _cmsOfferImageController.text,
                };
                final success = await Provider.of<AdminProvider>(context, listen: false)
                    .updateCMSContent(contentId, payload);

                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Offer saved successfully!'), backgroundColor: Colors.green),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to save Offer.'), backgroundColor: Colors.red),
                  );
                }
              },
              icon: const Icon(Icons.check, size: 16, color: Colors.white),
              label: const Text('Save Offer Configuration', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCmsHeroDetailsForm(AdminProvider adminProvider) {
    final heroCms = adminProvider.cmsContent.firstWhere((c) => c['section'] == 'hero', orElse: () => null);
    if (heroCms == null) {
      return const Center(child: Text('Hero section configuration not found in CMS data.'));
    }

    final contentId = heroCms['content_id'];

    if (!_cmsControllersInitialized) {
      final data = heroCms['content_data'] ?? {};
      _cmsSubTagController.text = data['sub_tag'] ?? '';
      _cmsRatingController.text = data['rating'] ?? '';
      _cmsTitleController.text = data['title'] ?? '';
      _cmsSubtitleController.text = data['subtitle'] ?? '';
      _cmsTrustedController.text = data['trusted_text'] ?? '';
      _cmsImageController.text = data['image_url'] ?? '';
      _cmsControllersInitialized = true;
    }

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.stone),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.settings_input_component, color: AppTheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hero Section Configuration',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Configure the main above-the-fold content of your homepage.',
                        style: TextStyle(fontSize: 10, color: AppTheme.charcoalMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            
            // Sub Tag
            const Text('SUB TAG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsSubTagController,
              decoration: const InputDecoration(
                hintText: 'e.g. Luxury Rentals India',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 16),

            // Rating Display Text
            const Text('RATING DISPLAY TEXT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsRatingController,
              decoration: const InputDecoration(
                hintText: 'e.g. 4.9/5 Rating',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 16),

            // Heading Title (HTML Supported)
            const Text('HEADING TITLE (HTML SUPPORTED)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsTitleController,
              decoration: const InputDecoration(
                hintText: 'e.g. Elevate Your Living',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 16),

            // Subtitle / Paragraph Description
            const Text('SUBTITLE / PARAGRAPH DESCRIPTION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsSubtitleController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Describe your platform values and offerings...',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 16),

            // Trusted By Text
            const Text('TRUSTED BY TEXT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            TextField(
              controller: _cmsTrustedController,
              decoration: const InputDecoration(
                hintText: 'e.g. Trusted by 10,000+ happy families across India',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 16),

            // Hero Background Image
            const Text('HERO BACKGROUND IMAGE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _cmsImageController,
                    decoration: const InputDecoration(
                      hintText: 'Image URL',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _cmsUploadingImage ? null : _pickAndUploadCMSImage,
                  icon: _cmsUploadingImage
                      ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.upload, size: 14, color: Colors.white),
                  label: const Text('Upload Image', style: TextStyle(color: Colors.white, fontSize: 11)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    minimumSize: const Size(100, 40),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Save configuration button
            ElevatedButton.icon(
              onPressed: () => _saveHeroConfiguration(contentId),
              icon: const Icon(Icons.check, size: 16, color: Colors.white),
              label: const Text('Save Hero Configuration', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCmsField({
    required String label,
    required String hint,
    required String initialValue,
    required ValueChanged<String> onChanged,
    int maxLines = 1,
    Widget? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
            color: AppTheme.charcoalMuted,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          initialValue: initialValue,
          onChanged: onChanged,
          maxLines: maxLines,
          style: const TextStyle(fontSize: 13, color: AppTheme.charcoal),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: Colors.white,
            suffixIcon: suffixIcon,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppTheme.primary),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCmsFieldWithController({
    required String label,
    required String hint,
    required TextEditingController controller,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
            color: AppTheme.charcoalMuted,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          style: const TextStyle(fontSize: 13, color: AppTheme.charcoal),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: Colors.white,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppTheme.primary),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCmsHowItWorksList(AdminProvider adminProvider) {
    final howCms = adminProvider.cmsContent.firstWhere((c) => c['section'] == 'how_it_works', orElse: () => null);
    if (howCms == null) {
      return const Center(child: Text('How It Works configuration not found.'));
    }

    final contentId = howCms['content_id'] ?? 'cms_how_it_works_default';

    if (_cmsStepsList == null) {
      _cmsStepsList = List.from(howCms['content_data']?['steps'] ?? []);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.format_list_numbered, color: AppTheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'How It Works Steps',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.charcoal),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Configure onboarding steps and bullet points displayed on the landing page.',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: () => _saveHowItWorksConfiguration(contentId),
          icon: const Icon(Icons.check, size: 16),
          label: const Text('Save Steps Configuration'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        if (_cmsStepsList!.isEmpty)
          const Center(child: Text('No onboarding steps configured.'))
        else
          ...List.generate(_cmsStepsList!.length, (index) {
            final step = _cmsStepsList![index];
            final stepId = step['id'] ?? (index + 1);
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Step $stepId',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'SHORT TITLE',
                      hint: 'e.g. Host Registration',
                      initialValue: step['shortTitle'] ?? '',
                      onChanged: (val) {
                        _cmsStepsList![index]['shortTitle'] = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'HEADING TITLE',
                      hint: 'e.g. Host Registration & ID Verification',
                      initialValue: step['heading'] ?? '',
                      onChanged: (val) {
                        _cmsStepsList![index]['heading'] = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'SUBTITLE',
                      hint: 'e.g. Establish absolute safety and trust',
                      initialValue: step['subtitle'] ?? '',
                      onChanged: (val) {
                        _cmsStepsList![index]['subtitle'] = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'PARAGRAPH DESCRIPTION',
                      hint: 'e.g. Every host profile is verified...',
                      maxLines: 3,
                      initialValue: step['paragraph'] ?? '',
                      onChanged: (val) {
                        _cmsStepsList![index]['paragraph'] = val;
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildCmsTestimonialsList(AdminProvider adminProvider) {
    final testimonialsCms = adminProvider.cmsContent.firstWhere((c) => c['section'] == 'testimonials', orElse: () => null);
    if (testimonialsCms == null) {
      return const Center(child: Text('Testimonials configuration not found.'));
    }

    final contentId = testimonialsCms['content_id'] ?? 'cms_testimonials_default';

    if (_cmsTestimonialsList == null) {
      _cmsTestimonialsList = List.from(testimonialsCms['content_data']?['testimonials'] ?? testimonialsCms['content_data']?['items'] ?? []);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.favorite_border, color: AppTheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Guest Testimonials',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.charcoal),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Manage testimonials and reviews from your hosts and guests.',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      _cmsTestimonialsList!.add({
                        'id': 't${DateTime.now().millisecondsSinceEpoch}',
                        'name': '',
                        'role': '',
                        'rating': 5,
                        'comment': '',
                        'avatar_url': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                      });
                    });
                  },
                  icon: const Icon(Icons.add, size: 12),
                  label: const Text('Add Testimonial', style: TextStyle(fontSize: 10)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: () => _saveTestimonialsConfiguration(contentId),
          icon: const Icon(Icons.check, size: 16),
          label: const Text('Save Testimonials Configuration'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        if (_cmsTestimonialsList!.isEmpty)
          const Center(child: Text('No testimonials configured.'))
        else
          ...List.generate(_cmsTestimonialsList!.length, (index) {
            final testimonial = _cmsTestimonialsList![index];
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Testimonial #${index + 1}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 13),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                          onPressed: () {
                            setState(() {
                              _cmsTestimonialsList!.removeAt(index);
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'GUEST NAME',
                      hint: 'e.g. Mayur Patil',
                      initialValue: testimonial['name'] ?? '',
                      onChanged: (val) {
                        _cmsTestimonialsList![index]['name'] = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'ROLE / LOCATION',
                      hint: 'e.g. Remote Worker or Mumbai',
                      initialValue: testimonial['role'] ?? testimonial['location'] ?? '',
                      onChanged: (val) {
                        _cmsTestimonialsList![index]['role'] = val;
                        _cmsTestimonialsList![index]['location'] = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'RATING (1-5)',
                      hint: 'e.g. 5',
                      initialValue: (testimonial['rating'] ?? 5).toString(),
                      onChanged: (val) {
                        _cmsTestimonialsList![index]['rating'] = int.tryParse(val) ?? 5;
                      },
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'COMMENT / QUOTE',
                      hint: 'Describe their experience...',
                      maxLines: 3,
                      initialValue: testimonial['comment'] ?? testimonial['quote'] ?? '',
                      onChanged: (val) {
                        _cmsTestimonialsList![index]['comment'] = val;
                        _cmsTestimonialsList![index]['quote'] = val;
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildCmsBlogPostsList(AdminProvider adminProvider) {
    final blogCms = adminProvider.cmsContent.firstWhere((c) => c['section'] == 'blog', orElse: () => null);
    if (blogCms == null) {
      return const Center(child: Text('Blog configuration not found.'));
    }

    final contentId = blogCms['content_id'] ?? 'cms_blog_default';

    if (_cmsBlogsList == null) {
      _cmsBlogsList = List.from(blogCms['content_data']?['posts'] ?? []);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.article_outlined, color: AppTheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Journal Blog Posts',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.charcoal),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Manage property insights, local guide articles, and platform updates.',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      _cmsBlogsList!.add({
                        'id': 'p${DateTime.now().millisecondsSinceEpoch}',
                        'title': '',
                        'excerpt': '',
                        'image_url': 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600',
                        'author': 'STR Insights Desk',
                        'date': 'June 13, 2026',
                        'read_time': '5 min read',
                      });
                    });
                  },
                  icon: const Icon(Icons.add, size: 12),
                  label: const Text('Add Blog Post', style: TextStyle(fontSize: 10)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: () => _saveBlogsConfiguration(contentId),
          icon: const Icon(Icons.check, size: 16),
          label: const Text('Save Blog Posts Configuration'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        if (_cmsBlogsList!.isEmpty)
          const Center(child: Text('No blog posts configured.'))
        else
          ...List.generate(_cmsBlogsList!.length, (index) {
            final post = _cmsBlogsList![index];
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Blog Post #${index + 1}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 13),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                          onPressed: () {
                            setState(() {
                              _cmsBlogsList!.removeAt(index);
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'BLOG TITLE',
                      hint: 'e.g. Unlocking Passive Income...',
                      initialValue: post['title'] ?? '',
                      onChanged: (val) {
                        _cmsBlogsList![index]['title'] = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'EXCERPT / DESCRIPTION',
                      hint: 'Brief summary of the article...',
                      maxLines: 3,
                      initialValue: post['excerpt'] ?? '',
                      onChanged: (val) {
                        _cmsBlogsList![index]['excerpt'] = val;
                      },
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: _buildCmsField(
                            label: 'IMAGE URL',
                            hint: 'Image link or upload...',
                            initialValue: post['image_url'] ?? '',
                            onChanged: (val) {
                              _cmsBlogsList![index]['image_url'] = val;
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              _pickAndUploadImageForCms((url) {
                                setState(() {
                                    _cmsBlogsList![index]['image_url'] = url;
                                });
                              });
                            },
                            icon: const Icon(Icons.upload_file, size: 14),
                            label: const Text('Upload', style: TextStyle(fontSize: 11)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.stone,
                              foregroundColor: AppTheme.charcoal,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildCmsField(
                            label: 'AUTHOR',
                            hint: 'e.g. Curation Team',
                            initialValue: post['author'] ?? 'STR Insights Desk',
                            onChanged: (val) {
                              _cmsBlogsList![index]['author'] = val;
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildCmsField(
                            label: 'DATE',
                            hint: 'e.g. May 15, 2026',
                            initialValue: post['date'] ?? 'June 13, 2026',
                            onChanged: (val) {
                              _cmsBlogsList![index]['date'] = val;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildCmsField(
                      label: 'READ TIME',
                      hint: 'e.g. 5 min read',
                      initialValue: post['read_time'] ?? '5 min read',
                      onChanged: (val) {
                        _cmsBlogsList![index]['read_time'] = val;
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildCmsFooterConfig(AdminProvider adminProvider) {
    final footerCms = adminProvider.cmsContent.firstWhere((c) => c['section'] == 'footer', orElse: () => null);
    if (footerCms == null) {
      return const Center(child: Text('Footer configuration not found.'));
    }

    final contentId = footerCms['content_id'] ?? 'cms_footer_default';
    final data = footerCms['content_data'] ?? {};

    if (!_footerInitialized) {
      _footerDescCtrl.text = data['brand_description'] ?? '';
      _footerLocCtrl.text = data['location'] ?? '';
      _footerEmailCtrl.text = data['email'] ?? '';
      _footerPhoneCtrl.text = data['phone'] ?? '';
      _footerGrievanceTitleCtrl.text = data['grievance_title'] ?? '';
      _footerOfficerNameCtrl.text = data['grievance_officer'] ?? '';
      _footerOfficerEmailCtrl.text = data['grievance_email'] ?? '';
      _footerOfficerPhoneCtrl.text = data['grievance_phone'] ?? '';
      _footerResolutionTextCtrl.text = data['resolution_text'] ?? '';
      _footerTermsCtrl.text = data['terms_text'] ?? 'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.';
      _footerPrivacyCtrl.text = data['privacy_text'] ?? 'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.';
      _footerCheckinCtrl.text = data['checkin_text'] ?? 'Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM.';
      _footerInitialized = true;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.contact_support_outlined, color: AppTheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Footer Contact & Grievance',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.charcoal),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Edit public footer contact details and escalation information.',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: () => _saveFooterConfiguration(contentId),
          icon: const Icon(Icons.check, size: 16),
          label: const Text('Save Footer Configuration'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildCmsFieldWithController(
                  label: 'BRAND DESCRIPTION',
                  hint: 'Redefining short-term rentals...',
                  maxLines: 4,
                  controller: _footerDescCtrl,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'LOCATION',
                        hint: 'e.g. Nashik, Maharashtra',
                        controller: _footerLocCtrl,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'CONTACT EMAIL',
                        hint: 'e.g. support@x-space360.com',
                        controller: _footerEmailCtrl,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'CONTACT PHONE',
                        hint: 'e.g. +91 8484826247',
                        controller: _footerPhoneCtrl,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'GRIEVANCE HEADING',
                        hint: 'e.g. Grievance & Escalations',
                        controller: _footerGrievanceTitleCtrl,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'OFFICER NAME',
                        hint: 'e.g. Rahul Mundra',
                        controller: _footerOfficerNameCtrl,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'OFFICER EMAIL',
                        hint: 'e.g. nodal.officer@rupiyaloan.com',
                        controller: _footerOfficerEmailCtrl,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'OFFICER PHONE',
                        hint: 'e.g. +91 76206 66949',
                        controller: _footerOfficerPhoneCtrl,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildCmsFieldWithController(
                        label: 'RESOLUTION TEXT',
                        hint: 'e.g. Resolution: 7 working days',
                        controller: _footerResolutionTextCtrl,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildCmsFieldWithController(
                  label: 'TERMS & CONDITIONS TEXT',
                  hint: 'Enter terms and conditions text...',
                  maxLines: 5,
                  controller: _footerTermsCtrl,
                ),
                const SizedBox(height: 16),
                _buildCmsFieldWithController(
                  label: 'PRIVACY POLICY TEXT',
                  hint: 'Enter privacy policy text...',
                  maxLines: 5,
                  controller: _footerPrivacyCtrl,
                ),
                const SizedBox(height: 16),
                _buildCmsFieldWithController(
                  label: 'CHECK-IN INSTRUCTIONS TEXT',
                  hint: 'Enter check-in instructions text...',
                  maxLines: 5,
                  controller: _footerCheckinCtrl,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showApproveDialog(String propertyId, bool approve) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  approve ? 'Confirm Final Live Approval' : 'Reject Property Listing',
                  style: Theme.of(context).textTheme.displayMedium,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _remarksController,
                  decoration: InputDecoration(
                    labelText: approve ? 'Final Remarks' : 'Reason for rejection',
                  ),
                  maxLines: 2,
                  validator: (v) => v == null || v.isEmpty ? 'Remarks required' : null,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () async {
                    if (!_formKey.currentState!.validate()) return;
                    final success = approve
                        ? await Provider.of<VerificationProvider>(context, listen: false)
                            .adminApprove(propertyId, {'remarks': _remarksController.text})
                        : await Provider.of<VerificationProvider>(context, listen: false)
                            .adminReject(propertyId, _remarksController.text);
                            
                    if (success && context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(approve ? 'Property is now LIVE!' : 'Property listing rejected.')),
                      );
                      _loadData();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: approve ? Colors.green.shade700 : AppTheme.primary,
                  ),
                  child: Text(approve ? 'Publish Live' : 'Reject'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  // --- ADD / EDIT USER DIALOG (HIGH FIDELITY REDESIGN) ---
  void _showUserFormDialog({Map<String, dynamic>? existingUser}) {
    final isEdit = existingUser != null;
    final nameCtrl = TextEditingController(text: existingUser?['full_name'] ?? '');
    final emailCtrl = TextEditingController(text: existingUser?['email'] ?? '');
    final phoneCtrl = TextEditingController(text: existingUser?['phone'] ?? '');
    final passwordCtrl = TextEditingController();
    final cityCtrl = TextEditingController(text: existingUser?['city'] ?? '');
    final stateCtrl = TextEditingController(text: existingUser?['state'] ?? '');
    final birthdateCtrl = TextEditingController(text: existingUser?['birthdate'] ?? '');
    String roleVal = existingUser?['role'] ?? 'guest';
    
    // Picked file local state
    dynamic pickedFile; // will store XFile
    bool isUploadingImage = false;
    String? uploadedImageUrl = existingUser?['profile_image'];

    final userFormKey = GlobalKey<FormState>();

    // Dynamic prefix helper for system-generated UID banner
    String getPrefixForRole(String role) {
      switch (role.toLowerCase()) {
        case 'admin':
          return 'ADM';
        case 'host':
          return 'HST';
        case 'broker':
          return 'BKR';
        case 'employee':
          return 'EMP';
        case 'guest':
        default:
          return 'GST';
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final uidPreview = '${getPrefixForRole(roleVal)}XXXXXX001';

            Future<void> pickAndUploadImage() async {
              try {
                final picker = ImagePicker();
                final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
                if (file != null) {
                  setModalState(() {
                    pickedFile = file;
                    isUploadingImage = true;
                  });

                  // Upload to server using ApiService
                  final apiService = ApiService();
                  final formData = dio_pkg.FormData.fromMap({
                    'file': await dio_pkg.MultipartFile.fromFile(file.path, filename: file.name),
                  });
                  final response = await apiService.dio.post('/upload/image', data: formData);
                  if (response.statusCode == 200 || response.statusCode == 201) {
                    setModalState(() {
                      uploadedImageUrl = response.data['url'];
                    });
                  }
                }
              } catch (e) {
                debugPrint('Error uploading image: $e');
              } finally {
                setModalState(() {
                  isUploadingImage = false;
                });
              }
            }

            Future<void> selectBirthdate() async {
              final DateTime? picked = await showDatePicker(
                context: context,
                initialDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
                firstDate: DateTime(1900),
                lastDate: DateTime.now(),
                builder: (context, child) {
                  return Theme(
                    data: Theme.of(context).copyWith(
                      colorScheme: const ColorScheme.light(
                        primary: AppTheme.primary,
                        onPrimary: Colors.white,
                        onSurface: AppTheme.charcoal,
                      ),
                    ),
                    child: child!,
                  );
                },
              );
              if (picked != null) {
                setModalState(() {
                  birthdateCtrl.text = DateFormat('yyyy-MM-dd').format(picked);
                });
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                top: 24,
                left: 20,
                right: 20,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: userFormKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header with Shield Icon
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isEdit ? 'Edit User Details' : 'Create New User',
                                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.charcoal,
                                      ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'REGISTER PROFESSIONAL NODES IN THE STR NETWORK',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                    color: AppTheme.charcoalMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.05),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.shield_outlined,
                              color: AppTheme.primary,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Divider(color: AppTheme.stone, thickness: 1),
                      const SizedBox(height: 16),

                      // PROFILE IMAGE section
                      const Text(
                        'PROFILE IMAGE',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: AppTheme.charcoalLight,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.stone),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                ElevatedButton(
                                  onPressed: pickAndUploadImage,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFFDE8E8),
                                    foregroundColor: AppTheme.primary,
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                  ),
                                  child: isUploadingImage
                                      ? const SizedBox(
                                          width: 14,
                                          height: 14,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primary),
                                          ),
                                        )
                                      : const Text(
                                          'CHOOSE FILE',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    pickedFile != null
                                        ? pickedFile.name
                                        : (uploadedImageUrl != null ? 'Image attached' : 'No file chosen'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Supported formats: PNG, JPG, JPEG, WEBP, GIF (Max 8MB)',
                              style: TextStyle(
                                fontSize: 9,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // FULL NAME
                      const Text(
                        'FULL NAME',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoalLight,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(
                          hintText: 'John Doe',
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 16),

                      // EMAIL ADDRESS & PHONE NUMBER (Two-column row)
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'EMAIL ADDRESS',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: emailCtrl,
                                  keyboardType: TextInputType.emailAddress,
                                  decoration: const InputDecoration(
                                    hintText: 'admin@goldenrichstay.com',
                                  ),
                                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'PHONE NUMBER',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: phoneCtrl,
                                  keyboardType: TextInputType.phone,
                                  decoration: const InputDecoration(
                                    hintText: '+91...',
                                  ),
                                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // PASSWORD
                      if (!isEdit) ...[
                        const Text(
                          'PASSWORD',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoalLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: passwordCtrl,
                          obscureText: true,
                          decoration: const InputDecoration(
                            hintText: '.........',
                          ),
                          validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 16),
                      ],

                      // ROLE & CITY (Two-column row)
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'ROLE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                DropdownButtonFormField<String>(
                                  value: roleVal,
                                  items: const [
                                    DropdownMenuItem(value: 'guest', child: Text('GUEST')),
                                    DropdownMenuItem(value: 'host', child: Text('HOST')),
                                    DropdownMenuItem(value: 'admin', child: Text('ADMIN')),
                                    DropdownMenuItem(value: 'broker', child: Text('BROKER')),
                                    DropdownMenuItem(value: 'employee', child: Text('EMPLOYEE')),
                                  ],
                                  onChanged: (val) {
                                    if (val != null) {
                                      setModalState(() {
                                        roleVal = val;
                                      });
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'CITY',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: cityCtrl,
                                  decoration: const InputDecoration(
                                    hintText: 'e.g. Mumbai',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // STATE & BIRTHDATE (Two-column row)
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'STATE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: stateCtrl,
                                  decoration: const InputDecoration(
                                    hintText: 'e.g. Maharashtra',
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'BIRTHDATE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: birthdateCtrl,
                                  readOnly: true,
                                  onTap: selectBirthdate,
                                  decoration: const InputDecoration(
                                    hintText: 'Select Date',
                                    suffixIcon: Icon(Icons.calendar_today_outlined, size: 16),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // SYSTEM GENERATED UID BANNER
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF6F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFEFE8E0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.shield_outlined,
                                color: AppTheme.primary,
                                size: 16,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'SYSTEM GENERATED UID',
                                    style: TextStyle(
                                      fontSize: 8,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.charcoalMuted,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    uidPreview,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.charcoal,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE2EBE5),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'SECURE',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF2E6B4E),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // CANCEL & CREATE BUTTONS
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text(
                              'CANCEL',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.charcoalLight,
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          ElevatedButton(
                            onPressed: () async {
                              if (!userFormKey.currentState!.validate()) return;
                              final adminProv = Provider.of<AdminProvider>(context, listen: false);
                              
                              bool success;
                              if (isEdit) {
                                final updatePayload = {
                                  'full_name': nameCtrl.text,
                                  'email': emailCtrl.text,
                                  'phone': phoneCtrl.text,
                                  'role': roleVal,
                                  'city': cityCtrl.text,
                                  'state': stateCtrl.text,
                                  'birthdate': birthdateCtrl.text.isEmpty ? null : birthdateCtrl.text,
                                  'profile_image': uploadedImageUrl,
                                };
                                success = await adminProv.updateUser(existingUser['user_id'], updatePayload);
                              } else {
                                final createPayload = {
                                  'full_name': nameCtrl.text,
                                  'email': emailCtrl.text,
                                  'phone': phoneCtrl.text,
                                  'password': passwordCtrl.text,
                                  'role': roleVal,
                                  'city': cityCtrl.text,
                                  'state': stateCtrl.text,
                                  'birthdate': birthdateCtrl.text.isEmpty ? null : birthdateCtrl.text,
                                  'profile_image': uploadedImageUrl,
                                  'terms_accepted': true,
                                };
                                success = await adminProv.createUser(createPayload);
                              }
                              
                              if (success && context.mounted) {
                                Navigator.pop(context);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(isEdit ? 'User updated successfully!' : 'User created successfully!')),
                                );
                                _loadData();
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(
                              isEdit ? 'Save Changes' : 'Create User',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  // --- VIEW DETAILS / KYC STATUS DIALOG ---
  void _showUserDetailsDialog(Map<String, dynamic> user) {
    String currentKyc = user['kyc_status'] ?? 'unverified';
    final remarksCtrl = TextEditingController(text: user['kyc_remarks'] ?? '');
    
    List<dynamic> brokers = [];
    bool isLoadingBrokers = true;
    bool brokersFetched = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            if (!brokersFetched) {
              brokersFetched = true;
              Future.microtask(() async {
                try {
                  final response = await ApiService().dio.get('/admin/users', queryParameters: {'role': 'broker'});
                  if (response.statusCode == 200) {
                    setModalState(() {
                      brokers = response.data['users'] ?? [];
                      isLoadingBrokers = false;
                    });
                  }
                } catch (_) {
                  setModalState(() {
                    isLoadingBrokers = false;
                  });
                }
              });
            }

            String? getDocUrl(List<dynamic> docs, String docType) {
              for (var d in docs) {
                if (d is Map && d['document_type'] == docType) {
                  return d['document_url']?.toString();
                }
              }
              return null;
            }

            String getDocStatus(List<dynamic> docs, String docType) {
              for (var d in docs) {
                if (d is Map && d['document_type'] == docType) {
                  return (d['status'] ?? 'pending').toString().toLowerCase();
                }
              }
              return 'pending';
            }

            Future<void> updateDocStatus(String docType, String status, {String? reason}) async {
              final apiService = ApiService();
              try {
                final response = await apiService.dio.patch(
                  '/admin/users/${user['user_id']}/kyc/documents',
                  data: {
                    'document_type': docType,
                    'status': status,
                    'rejection_reason': reason,
                  },
                );
                if (response.statusCode == 200) {
                  final updatedDocs = List<Map<String, dynamic>>.from(
                    (user['kyc_documents'] as List? ?? []).map((e) => Map<String, dynamic>.from(e))
                  );
                  final docIdx = updatedDocs.indexWhere((d) => d['document_type'] == docType);
                  if (docIdx != -1) {
                    updatedDocs[docIdx]['status'] = status;
                    updatedDocs[docIdx]['rejection_reason'] = reason;
                  } else {
                    updatedDocs.add({
                      'document_type': docType,
                      'status': status,
                      'rejection_reason': reason,
                    });
                  }
                  setModalState(() {
                    user['kyc_documents'] = updatedDocs;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Document status updated to $status!'), backgroundColor: Colors.green),
                  );
                }
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Failed to update document status.'), backgroundColor: Colors.red),
                );
              }
            }

            void promptDocRejection(String docType, String docTitle) {
              final reasonCtrl = TextEditingController();
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: Text('Reject $docTitle'),
                  content: TextField(
                    controller: reasonCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Reason for rejection',
                      hintText: 'e.g. Image blurry or document expired',
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('CANCEL'),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        updateDocStatus(docType, 'rejected', reason: reasonCtrl.text.trim());
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                      child: const Text('REJECT'),
                    ),
                  ],
                ),
              );
            }

            Widget buildDocCard(String title, String docType) {
              final docsList = user['kyc_documents'] as List? ?? [];
              final url = getDocUrl(docsList, docType);
              final status = getDocStatus(docsList, docType);
              
              Color statusColor = Colors.orange;
              Color bgTint = Colors.orange.shade50;
              if (status == 'approved') {
                statusColor = Colors.green;
                bgTint = Colors.green.shade50;
              } else if (status == 'rejected') {
                statusColor = Colors.red;
                bgTint = Colors.red.shade50;
              }
              
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppTheme.stone),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: bgTint,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: statusColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => _viewDocumentFile(url, title),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.charcoal,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('VIEW FILE'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextButton.icon(
                              onPressed: () => updateDocStatus(docType, 'approved'),
                              icon: const Icon(Icons.check, size: 14, color: Colors.green),
                              label: const Text('APPROVE', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextButton.icon(
                              onPressed: () => promptDocRejection(docType, title),
                              icon: const Icon(Icons.close, size: 14, color: Colors.red),
                              label: const Text('REJECT', style: TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }

            Widget buildInfoTile(String label, String value, {Widget? trailing}) {
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.stone),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.charcoalMuted,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    trailing ?? Text(
                      value,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.charcoal,
                      ),
                    ),
                  ],
                ),
              );
            }

            Color mainKycColor = Colors.orange;
            Color mainKycBg = Colors.orange.shade50;
            if (currentKyc == 'approved') {
              mainKycColor = Colors.green;
              mainKycBg = Colors.green.shade50;
            } else if (currentKyc == 'rejected') {
              mainKycColor = Colors.red;
              mainKycBg = Colors.red.shade50;
            }

            return Container(
              height: MediaQuery.of(context).size.height * 0.9,
              decoration: const BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  // Beautiful Header
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                      border: Border(bottom: BorderSide(color: AppTheme.stone)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: AppTheme.stone,
                          backgroundImage: user['profile_image'] != null && user['profile_image'].toString().isNotEmpty
                              ? NetworkImage(_getFullImageUrl(user['profile_image'].toString()))
                              : null,
                          child: user['profile_image'] == null || user['profile_image'].toString().isEmpty
                              ? Text(
                                  (user['full_name'] ?? 'U')[0].toString().toUpperCase(),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.charcoal),
                                )
                              : null,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user['full_name'] ?? 'Host KYC Review',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                              ),
                              const Text(
                                'HOST KYC REVIEW DASHBOARD',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.charcoalMuted, letterSpacing: 0.5),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: mainKycBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            currentKyc == 'unverified' ? 'PENDING REVIEW' : currentKyc.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: mainKycColor,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppTheme.charcoalLight),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),

                  // Scrollable Body
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Section 1: HOST INFORMATION
                          const Text(
                            'HOST INFORMATION',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primary,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(child: buildInfoTile('Email Address', user['email'] ?? 'N/A')),
                              const SizedBox(width: 8),
                              Expanded(child: buildInfoTile('Phone Number', user['phone'] ?? 'N/A')),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(child: buildInfoTile('Location', '${user['city'] ?? ''}, ${user['state'] ?? ''}')),
                              const SizedBox(width: 8),
                              Expanded(child: buildInfoTile('Status', user['is_active'] == true ? 'Active Account' : 'Inactive Account')),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(child: buildInfoTile('Host User ID', user['user_id'] ?? 'N/A')),
                              const SizedBox(width: 8),
                              Expanded(child: buildInfoTile('Joined On', _formatDate(user['created_at']))),
                            ],
                          ),
                          const SizedBox(height: 8),
                          buildInfoTile(
                            'Assigned Broker',
                            '',
                            trailing: isLoadingBrokers
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                                  )
                                : DropdownButtonHideUnderline(
                                    child: DropdownButton<String?>(
                                      value: user['broker_id'],
                                      hint: const Text('- Assign a Broker -', style: TextStyle(fontSize: 13, color: AppTheme.charcoalMuted)),
                                      isDense: true,
                                      isExpanded: true,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                                      items: [
                                        const DropdownMenuItem<String?>(
                                          value: null,
                                          child: Text('- None / Assign -', style: TextStyle(color: AppTheme.charcoalMuted, fontWeight: FontWeight.normal)),
                                        ),
                                        ...brokers.map((b) => DropdownMenuItem<String?>(
                                          value: b['user_id'],
                                          child: Text(
                                            '${b['full_name']} (${b['lg_code'] ?? ''})',
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        )),
                                      ],
                                      onChanged: (val) async {
                                        final apiService = ApiService();
                                        try {
                                          final response = await apiService.dio.patch(
                                            '/admin/users/${user['user_id']}',
                                            data: {'broker_id': val},
                                          );
                                          if (response.statusCode == 200) {
                                            setModalState(() {
                                              user['broker_id'] = val;
                                            });
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(content: Text('Broker assigned successfully!'), backgroundColor: Colors.green),
                                            );
                                          }
                                        } catch (e) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Failed to assign broker.'), backgroundColor: Colors.red),
                                          );
                                        }
                                      },
                                    ),
                                  ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'KYC REMARKS / NOTES',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoalLight,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: remarksCtrl,
                            decoration: const InputDecoration(
                              hintText: 'Enter review remarks, approval feedback or rejection reasons...',
                              filled: true,
                              fillColor: Colors.white,
                            ),
                            maxLines: 2,
                          ),
                          const SizedBox(height: 24),

                          // Section 2: UPLOADED VERIFICATION DOCUMENTS
                          const Text(
                            'UPLOADED VERIFICATION DOCUMENTS',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primary,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 12),
                          buildDocCard('Aadhar Card', 'aadhar_card'),
                          buildDocCard('Property Ownership Proof', 'property_proof'),
                          buildDocCard('Cancelled Cheque', 'cancelled_cheque'),
                          
                          // Check if GST is uploaded
                          if (getDocUrl(user['kyc_documents'] as List? ?? [], 'gst_certificate') != null)
                            buildDocCard('GST Certificate', 'gst_certificate'),
                            
                          const SizedBox(height: 24),

                          // Section 3: X-Space360 GRP & Owner (Host) Agreement
                          const Text(
                            'AGREEMENT & SIGNATURE',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primary,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFAF6F2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFEFE8E0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'X-Space360 GRP & Owner (Host) Agreement.',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: user['agreement_signed_at'] != null ? Colors.green.shade50 : Colors.grey.shade100,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        user['agreement_signed_at'] != null ? 'SIGNED' : 'UNSIGNED',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: user['agreement_signed_at'] != null ? Colors.green.shade700 : Colors.grey.shade600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'OWNER NAME',
                                            style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: AppTheme.charcoalMuted),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            user['agreement_owner_name'] ?? 'N/A',
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'SIGNED ON',
                                            style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: AppTheme.charcoalMuted),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            user['agreement_signed_at'] != null
                                                ? _formatDate(user['agreement_signed_at'])
                                                : 'N/A',
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'AGREEMENT SIGNATURE',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppTheme.charcoalMuted, letterSpacing: 0.5),
                                ),
                                const SizedBox(height: 6),
                                Container(
                                  width: double.infinity,
                                  height: 80,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFE5E5DF)),
                                  ),
                                  alignment: Alignment.center,
                                  child: user['agreement_signature'] != null && user['agreement_signature'].toString().isNotEmpty
                                      ? Text(
                                          user['agreement_signature'],
                                          style: const TextStyle(
                                            fontFamily: 'cursive',
                                            fontSize: 24,
                                            fontWeight: FontWeight.w500,
                                            fontStyle: FontStyle.italic,
                                            color: Color(0xFF1E3A8A), // Deep navy
                                          ),
                                        )
                                      : const Text(
                                          'No signature captured',
                                          style: TextStyle(color: AppTheme.charcoalMuted, fontSize: 12, fontStyle: FontStyle.italic),
                                        ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Bottom Action Bar
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: AppTheme.stone)),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Verification Guideline Warning
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF9F2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFFFEAD2)),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.warning_amber_rounded, color: Colors.orange.shade800, size: 20),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'Verify all documents and signature against local guidelines before approval.',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF8A5B2C),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () async {
                                  final apiService = ApiService();
                                  try {
                                    final response = await apiService.dio.patch(
                                      '/admin/users/${user['user_id']}/kyc',
                                      queryParameters: {
                                        'kyc_status': 'rejected',
                                        'remarks': remarksCtrl.text,
                                      },
                                    );
                                    if (response.statusCode == 200 && context.mounted) {
                                      Navigator.pop(context);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('KYC Rejected.'), backgroundColor: Colors.red),
                                      );
                                      _loadData();
                                    }
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Failed to reject KYC.')),
                                    );
                                  }
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.red,
                                  side: const BorderSide(color: Colors.red),
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                ),
                                child: const Text('REJECT KYC'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () async {
                                  final apiService = ApiService();
                                  try {
                                    final response = await apiService.dio.patch(
                                      '/admin/users/${user['user_id']}/kyc',
                                      queryParameters: {
                                        'kyc_status': 'approved',
                                        'remarks': remarksCtrl.text,
                                      },
                                    );
                                    if (response.statusCode == 200 && context.mounted) {
                                      Navigator.pop(context);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('KYC Approved & Host Live!'), backgroundColor: Colors.green),
                                      );
                                      _loadData();
                                    }
                                  } catch (e) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Failed to approve KYC.')),
                                    );
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green.shade700,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                ),
                                child: const Text('APPROVE KYC & GO LIVE'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Helper method for profile images
  String _getFullImageUrl(String? path) {
    return AppConfig.resolveImageUrl(path);
  }

  // Lightbox built-in document viewer
  void _viewDocumentFile(String? url, String title) {
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No file uploaded.')),
      );
      return;
    }
    
    final fullUrl = _getFullImageUrl(url);
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppBar(
              backgroundColor: Colors.black,
              title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16)),
              leading: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(8),
              child: Image.network(
                fullUrl,
                fit: BoxFit.contain,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return const SizedBox(
                    height: 200,
                    child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                  );
                },
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    height: 200,
                    color: Colors.grey.shade100,
                    child: const Center(
                      child: Icon(Icons.broken_image, size: 48, color: Colors.grey),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- ADD COUPON DIALOG ---
  void _showCouponFormDialog() {
    final codeCtrl = TextEditingController();
    final valCtrl = TextEditingController();
    final propCtrl = TextEditingController();
    final couponBhkCtrl = TextEditingController();
    final couponSqftRangeCtrl = TextEditingController();
    String discountType = 'percentage';
    String couponType = 'booking';
    String couponPlanType = '';
    String couponPropertyCategory = '';
    final couponFormKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                top: 24,
                left: 24,
                right: 24,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: couponFormKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Create Promo Coupon', style: Theme.of(context).textTheme.displayMedium),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: codeCtrl,
                        decoration: const InputDecoration(labelText: 'Coupon Code (e.g. SAVE50)'),
                        textCapitalization: TextCapitalization.characters,
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: discountType,
                        decoration: const InputDecoration(labelText: 'Discount Type'),
                        items: const [
                          DropdownMenuItem(value: 'percentage', child: Text('Percentage (%)')),
                          DropdownMenuItem(value: 'fixed', child: Text('Flat Discount (₹)')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              discountType = val;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: valCtrl,
                        decoration: const InputDecoration(labelText: 'Discount Value'),
                        keyboardType: TextInputType.number,
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: couponType,
                        decoration: const InputDecoration(labelText: 'Coupon Applicability'),
                        items: const [
                          DropdownMenuItem(value: 'booking', child: Text('Guest Booking')),
                          DropdownMenuItem(value: 'subscription', child: Text('Host Subscription')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              couponType = val;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      if (couponType == 'booking') ...[
                        TextFormField(
                          controller: propCtrl,
                          decoration: const InputDecoration(labelText: 'Specific Property ID (Optional)'),
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (couponType == 'subscription') ...[
                        DropdownButtonFormField<String>(
                          value: couponPlanType,
                          decoration: const InputDecoration(labelText: 'Plan Type (Optional)'),
                          items: const [
                            DropdownMenuItem(value: '', child: Text('Any Plan')),
                            DropdownMenuItem(value: 'studio', child: Text('Studio')),
                            DropdownMenuItem(value: '1bhk', child: Text('1 BHK')),
                            DropdownMenuItem(value: '2bhk', child: Text('2 BHK')),
                            DropdownMenuItem(value: '3bhk', child: Text('3 BHK')),
                            DropdownMenuItem(value: '4bhk_plus', child: Text('4 BHK+')),
                            DropdownMenuItem(value: 'commercial', child: Text('Commercial')),
                            DropdownMenuItem(value: 'banquet', child: Text('Event/Banquet')),
                          ],
                          onChanged: (val) => setModalState(() => couponPlanType = val ?? ''),
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          value: couponPropertyCategory,
                          decoration: const InputDecoration(labelText: 'Property Category (Optional)'),
                          items: const [
                            DropdownMenuItem(value: '', child: Text('Any Category')),
                            DropdownMenuItem(value: 'residential', child: Text('Residential')),
                            DropdownMenuItem(value: 'commercial', child: Text('Commercial')),
                            DropdownMenuItem(value: 'event_venue', child: Text('Event Venue')),
                          ],
                          onChanged: (val) => setModalState(() => couponPropertyCategory = val ?? ''),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: couponBhkCtrl,
                          decoration: const InputDecoration(
                            labelText: 'BHK / Size Key (Optional)',
                            hintText: 'e.g. 2bhk, small, large_event',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: couponSqftRangeCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Sq.ft Range (Optional)',
                            hintText: 'e.g. <500, 500-2000, 5000+',
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () async {
                          if (!couponFormKey.currentState!.validate()) return;
                          
                          final adminProv = Provider.of<AdminProvider>(context, listen: false);
                          final numVal = double.tryParse(valCtrl.text) ?? 0.0;
                          
                          final payload = {
                            'code': codeCtrl.text.toUpperCase().trim(),
                            'discount_type': discountType,
                            'discount_value': numVal,
                            'coupon_type': couponType,
                            'property_id': propCtrl.text.isEmpty ? null : propCtrl.text.trim(),
                            'plan_type': couponPlanType.isEmpty ? null : couponPlanType,
                            'property_category': couponPropertyCategory.isEmpty ? null : couponPropertyCategory,
                            'bhk_type': couponBhkCtrl.text.trim().isEmpty ? null : couponBhkCtrl.text.trim(),
                            'sqft_range': couponSqftRangeCtrl.text.trim().isEmpty ? null : couponSqftRangeCtrl.text.trim(),
                          };
                          
                          final success = await adminProv.createCoupon(payload);
                          if (success && context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Coupon created successfully!')),
                            );
                            _loadData();
                          }
                        },
                        child: const Text('Publish Coupon'),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  // --- ADD AI VOICE AGENT DIALOG ---
  void _showAIAgentDialog() {
    final nameCtrl = TextEditingController();
    final greetingCtrl = TextEditingController();
    final voiceNameCtrl = TextEditingController(text: 'en-US-Neural2-F');
    String voiceType = 'female';
    String language = 'english';
    final agentFormKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                top: 24,
                left: 24,
                right: 24,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: agentFormKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Configure AI Call Agent', style: Theme.of(context).textTheme.displayMedium),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: nameCtrl,
                        decoration: const InputDecoration(labelText: 'Agent Name'),
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: voiceType,
                        decoration: const InputDecoration(labelText: 'Gender / Voice Type'),
                        items: const [
                          DropdownMenuItem(value: 'female', child: Text('Female voice')),
                          DropdownMenuItem(value: 'male', child: Text('Male voice')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              voiceType = val;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: language,
                        decoration: const InputDecoration(labelText: 'Primary Language'),
                        items: const [
                          DropdownMenuItem(value: 'english', child: Text('English')),
                          DropdownMenuItem(value: 'hindi', child: Text('Hindi')),
                          DropdownMenuItem(value: 'marathi', child: Text('Marathi')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setModalState(() {
                              language = val;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: greetingCtrl,
                        decoration: const InputDecoration(labelText: 'Initial Greeting Message'),
                        maxLines: 2,
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: voiceNameCtrl,
                        decoration: const InputDecoration(labelText: 'Google Cloud TTS Voice Name'),
                        validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () async {
                          if (!agentFormKey.currentState!.validate()) return;
                          
                          final adminProv = Provider.of<AdminProvider>(context, listen: false);
                          
                          final payload = {
                            'agent_name': nameCtrl.text.trim(),
                            'voice_type': voiceType,
                            'language': language,
                            'greeting_message': greetingCtrl.text.trim(),
                            'external_voice_name': voiceNameCtrl.text.trim(),
                          };
                          
                          final success = await adminProv.createAIAgent(payload);
                          if (success && context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('AI Calling Agent created!')),
                            );
                            _loadData();
                          }
                        },
                        child: const Text('Save Agent config'),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final verificationProvider = Provider.of<VerificationProvider>(context);
    final adminProvider = Provider.of<AdminProvider>(context);
    final accountProvider = Provider.of<AccountProvider>(context);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.admin_panel_settings, color: AppTheme.primary, size: 28),
            const SizedBox(width: 8),
            Text(
              'Dashboard Overview',
              style: textTheme.displayMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        backgroundColor: AppTheme.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.charcoalMuted,
          indicatorColor: AppTheme.primary,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Users'),
            Tab(text: 'Properties'),
            Tab(text: 'Bookings'),
            Tab(text: 'Account'),
            Tab(text: 'Subscriptions'),
            Tab(text: 'CMS'),
            Tab(text: 'Coupons'),
            Tab(text: 'Search Logs'),
            Tab(text: 'AI Voice Calls'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: OVERVIEW STATS (MATCHING IMAGE 1 EXACTLY)
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: ListView(
              padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
              children: [
                _buildWebOverviewStats(adminProvider.dashboardStats),
              ],
            ),
          ),
          
          // TAB 2: USER MANAGEMENT (CRUD, SEARCH, AND FILTER FUNCTIONALITIES)
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: Column(
              children: [
                _buildUserFiltersSection(),
                Expanded(
                  child: adminProvider.isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                      : adminProvider.usersList.isEmpty
                          ? const Center(child: Text('No users match criteria.'))
                          : ListView.builder(
                              itemCount: adminProvider.usersList.length,
                              padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 8.0, bottom: 100.0),
                              itemBuilder: (context, index) {
                                final user = adminProvider.usersList[index];
                                return _buildUserCard(user);
                              },
                            ),
                ),
              ],
            ),
          ),

          // TAB 3: PROPERTIES / APPROVALS
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: Column(
              children: [
                // Search & Filter Section for Properties
                Container(
                  padding: const EdgeInsets.all(16.0),
                  color: Colors.white,
                  child: Column(
                    children: [
                      // Search Bar
                      TextField(
                        controller: _propertySearchController,
                        onChanged: (val) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: 'Search properties...',
                          prefixIcon: const Icon(Icons.search, color: AppTheme.charcoalMuted),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.stone),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.stone),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.primary),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Moderation Filter Dropdown
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Property Moderation',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppTheme.stone),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedPropertyFilter,
                                style: const TextStyle(color: AppTheme.charcoal, fontSize: 12, fontWeight: FontWeight.bold),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() {
                                      _selectedPropertyFilter = value;
                                    });
                                    Provider.of<VerificationProvider>(context, listen: false)
                                        .getAwaitingFinalApprovals(filter: value);
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(
                                    value: 'awaiting_approval',
                                    child: Text('Awaiting Final Approval (RM-approved)'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'pending_verification',
                                    child: Text('Pending Verification (Under Review)'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'all',
                                    child: Text('All Properties'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: verificationProvider.isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                      : () {
                          // Filter local list based on search query
                          final query = _propertySearchController.text.toLowerCase();
                          final filteredList = verificationProvider.awaitingFinalApprovals.where((item) {
                            final title = (item['title'] ?? '').toString().toLowerCase();
                            final city = (item['city'] ?? '').toString().toLowerCase();
                            final state = (item['state'] ?? '').toString().toLowerCase();
                            final hostName = (item['host_name'] ?? item['owner_id'] ?? '').toString().toLowerCase();
                            return title.contains(query) ||
                                city.contains(query) ||
                                state.contains(query) ||
                                hostName.contains(query);
                          }).toList();

                          if (filteredList.isEmpty) {
                            return const Center(child: Text('No properties match search criteria.'));
                          }

                          return ListView.builder(
                            itemCount: filteredList.length,
                            padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                            itemBuilder: (context, index) {
                              final item = filteredList[index];
                              final String propertyId = item['property_id'];
                              final status = (item['status'] ?? 'under_review').toString().toLowerCase();
                              
                              Color statusColor = Colors.orange;
                              if (status == 'active') statusColor = Colors.green;
                              if (status == 'rejected') statusColor = Colors.red;

                              return Card(
                                margin: const EdgeInsets.only(bottom: 16.0),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: const BorderSide(color: AppTheme.stone),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              item['title'] ?? 'Listing Approval',
                                              style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: statusColor.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              status.toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: statusColor,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text('Host: ${item['host_name'] ?? item['owner_id'] ?? 'N/A'}', style: textTheme.bodyMedium),
                                      const SizedBox(height: 4),
                                      Text('Location: ${item['city'] ?? ''}, ${item['state'] ?? ''}', style: textTheme.bodyMedium),
                                      if (item['rm_remarks'] != null) ...[
                                        const SizedBox(height: 8),
                                        Text(
                                          'RM Remarks: ${item['rm_remarks']}',
                                          style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.charcoalMuted),
                                        ),
                                      ],
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              icon: const Icon(Icons.visibility_outlined, size: 16),
                                              label: const Text('View'),
                                              onPressed: () {
                                                Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (context) => PropertyDetailScreen(propertyId: propertyId),
                                                  ),
                                                );
                                              },
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor: AppTheme.charcoal,
                                                side: const BorderSide(color: AppTheme.stone),
                                                padding: const EdgeInsets.symmetric(vertical: 8),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              icon: const Icon(Icons.edit_outlined, size: 16),
                                              label: const Text('Edit'),
                                              onPressed: () {
                                                Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (context) => HostListPropertyScreen(
                                                      property: PropertyModel.fromJson(Map<String, dynamic>.from(item)),
                                                    ),
                                                  ),
                                                ).then((_) => _loadData());
                                              },
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor: AppTheme.primary,
                                                side: const BorderSide(color: AppTheme.primary),
                                                padding: const EdgeInsets.symmetric(vertical: 8),
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (status == 'under_review') ...[
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                icon: const Icon(Icons.close, size: 16),
                                                label: const Text('Reject'),
                                                onPressed: () => _showApproveDialog(propertyId, false),
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: Colors.red.shade700,
                                                  side: BorderSide(color: Colors.red.shade700),
                                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                                  shape: RoundedRectangleBorder(
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: ElevatedButton.icon(
                                                icon: const Icon(Icons.check_circle_outline, size: 16),
                                                label: const Text('Verify & Approve'),
                                                onPressed: () {
                                                  final Map<String, dynamic> reviewData = {
                                                    'verification_id': item['verification_id'] ?? '',
                                                    'property_id': item['property_id'],
                                                    'owner_id': item['owner_id'],
                                                    'checklist': item['checklist'],
                                                    'geo_tagged_photos': item['geo_tagged_photos'],
                                                    'property_details': item,
                                                    'broker_details': {
                                                      'full_name': item['broker_id'] ?? 'Assigned Broker',
                                                      'user_id': item['broker_id'] ?? '',
                                                    },
                                                  };
                                                  Navigator.push(
                                                    context,
                                                    MaterialPageRoute(
                                                      builder: (context) => VerificationReportScreen(
                                                        reviewData: reviewData,
                                                        isAdmin: true,
                                                      ),
                                                    ),
                                                  ).then((_) => _loadData());
                                                },
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: Colors.green.shade700,
                                                  foregroundColor: Colors.white,
                                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                                  shape: RoundedRectangleBorder(
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            },
                          );
                        }(),
                ),
              ],
            ),
          ),

          // TAB 4: BOOKINGS
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: Column(
              children: [
                // Search & Filter Section for Bookings
                Container(
                  padding: const EdgeInsets.all(16.0),
                  color: Colors.white,
                  child: Column(
                    children: [
                      // Search Bar
                      TextField(
                        controller: _bookingSearchController,
                        onChanged: (val) => setState(() {}),
                        decoration: InputDecoration(
                          hintText: 'Search bookings...',
                          prefixIcon: const Icon(Icons.search, color: AppTheme.charcoalMuted),
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.stone),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.stone),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppTheme.primary),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Status Filter Dropdown
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Booking Management',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppTheme.stone),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedBookingFilter,
                                style: const TextStyle(color: AppTheme.charcoal, fontSize: 12, fontWeight: FontWeight.bold),
                                onChanged: (value) {
                                  if (value != null) {
                                    setState(() {
                                      _selectedBookingFilter = value;
                                    });
                                    Provider.of<AdminProvider>(context, listen: false)
                                        .getBookings(statusFilter: value);
                                  }
                                },
                                items: const [
                                  DropdownMenuItem(
                                    value: 'all',
                                    child: Text('All Statuses'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'pending',
                                    child: Text('Pending'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'confirmed',
                                    child: Text('Confirmed'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'cancelled',
                                    child: Text('Cancelled'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: adminProvider.isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                      : () {
                          // Filter locally by search query
                          final query = _bookingSearchController.text.toLowerCase();
                          final filteredList = adminProvider.bookingsList.where((bk) {
                            final bookingId = (bk['booking_id'] ?? '').toString().toLowerCase();
                            final guestName = (bk['guest']?['full_name'] ?? bk['guest_name'] ?? '').toString().toLowerCase();
                            final propTitle = (bk['property']?['title'] ?? bk['property_title'] ?? '').toString().toLowerCase();
                            return bookingId.contains(query) ||
                                guestName.contains(query) ||
                                propTitle.contains(query);
                          }).toList();

                          if (filteredList.isEmpty) {
                            return const Center(child: Text('No bookings match criteria.'));
                          }

                          return ListView.builder(
                            itemCount: filteredList.length,
                            padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                            itemBuilder: (context, index) {
                              final bk = filteredList[index];
                              final status = (bk['booking_status'] ?? bk['status'] ?? 'pending').toString().toLowerCase();
                              Color statusColor = Colors.orange;
                              if (status == 'confirmed') statusColor = Colors.green;
                              if (status == 'cancelled') statusColor = Colors.red;

                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: const BorderSide(color: AppTheme.stone),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'ID: ${bk['booking_id']}',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: statusColor.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              status.toUpperCase(),
                                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                                            ),
                                          )
                                        ],
                                      ),
                                      const Divider(height: 16),
                                      Text(
                                        bk['property']?['title'] ?? bk['property_title'] ?? 'Room Stay',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.charcoal),
                                      ),
                                      const SizedBox(height: 4),
                                      Text('Guest: ${bk['guest']?['full_name'] ?? bk['guest_name'] ?? 'Guest'}', style: textTheme.bodyMedium),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.date_range, size: 14, color: AppTheme.charcoalMuted),
                                          const SizedBox(width: 4),
                                          Text(
                                            '${bk['check_in']} to ${bk['check_out']}',
                                            style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text('Total Paid:', style: TextStyle(fontSize: 12, color: AppTheme.charcoalMuted)),
                                          Text(
                                            '₹${bk['total_price']}',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.secondary),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          );
                        }(),
                ),
              ],
            ),
          ),

          // TAB 5: ACCOUNT & FINANCES
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Sub-tabs chips
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                color: Colors.white,
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildAccountTabChip('Overview', 0),
                      const SizedBox(width: 8),
                      _buildAccountTabChip('Transactions', 1),
                      const SizedBox(width: 8),
                      _buildAccountTabChip('Payouts', 2),
                      const SizedBox(width: 8),
                      _buildAccountTabChip('Refunds', 3),
                      const SizedBox(width: 8),
                      _buildAccountTabChip('Top Hosts', 4),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: _buildAccountSubTabContent(context, accountProvider),
              ),
            ],
          ),

          // TAB 6: SUBSCRIPTIONS
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Subscription Management',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.charcoal),
                      ),
                      ElevatedButton.icon(
                        onPressed: _showCreatePlanDialog,
                        icon: const Icon(Icons.add, size: 16, color: Colors.white),
                        label: const Text('Create Plan', style: TextStyle(color: Colors.white)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: adminProvider.isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                      : adminProvider.subscriptionPlans.isEmpty
                          ? const Center(child: Text('No subscription plans found.'))
                          : ListView.builder(
                              itemCount: adminProvider.subscriptionPlans.length,
                              padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                              itemBuilder: (context, index) {
                                final plan = adminProvider.subscriptionPlans[index];
                                final isActive = plan['is_active'] == true;
                                final planId = plan['plan_id'] ?? '';

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: const BorderSide(color: AppTheme.stone),
                                  ),
                                  child: ListTile(
                                    leading: Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primary.withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.card_membership, color: AppTheme.primary),
                                    ),
                                    title: Text(plan['plan_name'] ?? plan['name'] ?? 'Premium Plan', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 2),
                                        Text('Monthly: ₹${plan['price_monthly']} | Annual: ₹${plan['price_annual']}'),
                                        if (plan['description'] != null) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            plan['description'],
                                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ],
                                    ),
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isActive ? Colors.green.shade50 : Colors.red.shade50,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            isActive ? 'ACTIVE' : 'INACTIVE',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: isActive ? Colors.green.shade700 : Colors.red.shade700,
                                            ),
                                          ),
                                        ),
                                        if (isActive) ...[
                                          const SizedBox(width: 8),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                            onPressed: () async {
                                              final confirm = await showDialog<bool>(
                                                context: context,
                                                builder: (context) => AlertDialog(
                                                  title: const Text('Deactivate Plan'),
                                                  content: const Text('Are you sure you want to deactivate this subscription plan?'),
                                                  actions: [
                                                    TextButton(
                                                      onPressed: () => Navigator.pop(context, false),
                                                      child: const Text('Cancel'),
                                                    ),
                                                    TextButton(
                                                      onPressed: () => Navigator.pop(context, true),
                                                      child: const Text('Deactivate', style: TextStyle(color: Colors.red)),
                                                    ),
                                                  ],
                                                ),
                                              );
                                              if (confirm == true) {
                                                await Provider.of<AdminProvider>(context, listen: false)
                                                    .deleteSubscriptionPlan(planId);
                                              }
                                            },
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
              ],
            ),
          ),

          // TAB 6: CMS
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: adminProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // CMS Header Settings (Title & Scrollable Sub-tabs chips)
                      Container(
                        padding: const EdgeInsets.all(16.0),
                        color: Colors.white,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Landing Page CMS Settings',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Manage Hero section, Blog posts, Guest testimonials, and onboarding steps data.',
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 16),
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  _buildCmsChip('HERO DETAILS', 0),
                                  const SizedBox(width: 8),
                                  _buildCmsChip('HOW IT WORKS', 1),
                                  const SizedBox(width: 8),
                                  _buildCmsChip('TESTIMONIALS', 2),
                                  const SizedBox(width: 8),
                                  _buildCmsChip('BLOG POSTS', 3),
                                  const SizedBox(width: 8),
                                  _buildCmsChip('FOOTER', 4),
                                  const SizedBox(width: 8),
                                  _buildCmsChip('PROMOTIONAL OFFER', 5),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                          child: _buildCmsSubTabContent(adminProvider),
                        ),
                      ),
                    ],
                  ),
          ),

          // TAB 7: COUPONS
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Promotional Coupons', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ElevatedButton.icon(
                        onPressed: _showCouponFormDialog,
                        icon: const Icon(Icons.add, size: 16, color: Colors.white),
                        label: const Text('Add Coupon'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: adminProvider.isLoading
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                      : adminProvider.couponsList.isEmpty
                          ? const Center(child: Text('No promo coupons found.'))
                          : ListView.builder(
                              itemCount: adminProvider.couponsList.length,
                              padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                              itemBuilder: (context, index) {
                                final coupon = adminProvider.couponsList[index];
                                final isActive = coupon['is_active'] == true;

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: const BorderSide(color: AppTheme.stone),
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                const Icon(Icons.local_offer, size: 16, color: AppTheme.primary),
                                                const SizedBox(width: 6),
                                                Text(
                                                  coupon['code'] ?? '',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.charcoal),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              coupon['discount_type'] == 'percentage'
                                                  ? 'Discount: ${coupon['discount_value']}% Off'
                                                  : 'Discount: ₹${coupon['discount_value']} Flat Off',
                                              style: textTheme.bodyMedium,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Applicable to: ${(coupon['coupon_type'] ?? 'booking').toString().toUpperCase()}',
                                              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                            ),
                                            if (coupon['plan_type'] != null || coupon['property_category'] != null || coupon['sqft_range'] != null)
                                              Text(
                                                [
                                                  if (coupon['plan_type'] != null) 'Plan: ${coupon['plan_type']}',
                                                  if (coupon['property_category'] != null) 'Category: ${coupon['property_category']}',
                                                  if (coupon['bhk_type'] != null) 'Size: ${coupon['bhk_type']}',
                                                  if (coupon['sqft_range'] != null) 'Sqft: ${coupon['sqft_range']}',
                                                ].join('  |  '),
                                                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                              ),
                                          ],
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isActive ? Colors.green.shade50 : Colors.red.shade50,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            isActive ? 'ACTIVE' : 'INACTIVE',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: isActive ? Colors.green.shade700 : Colors.red.shade700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
              ],
            ),
          ),

          // TAB 8: SEARCH LOGS
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: adminProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : adminProvider.searchLogsList.isEmpty
                    ? const Center(child: Text('No search logs available.'))
                    : ListView.builder(
                        itemCount: adminProvider.searchLogsList.length,
                        padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                        itemBuilder: (context, index) {
                          final log = adminProvider.searchLogsList[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: AppTheme.stone),
                            ),
                            child: ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade50,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(Icons.search, color: Colors.blue.shade700),
                              ),
                              title: Text(log['city'] ?? 'Unknown location', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('Results returned: ${log['results_count'] ?? 0}'),
                              trailing: Text(
                                _formatDate(log['timestamp']),
                                style: const TextStyle(fontSize: 10, color: Colors.grey),
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // TAB 9: AI VOICE CALLS
          RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: Column(
              children: [
                // Inner Tab Selector
                Container(
                  color: Colors.white,
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _aiInnerTab = 0),
                          child: Container(
                            alignment: Alignment.center,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                  color: _aiInnerTab == 0 ? AppTheme.primary : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                            ),
                            child: Text(
                              'Call Logs',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _aiInnerTab == 0 ? AppTheme.primary : AppTheme.charcoalMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _aiInnerTab = 1),
                          child: Container(
                            alignment: Alignment.center,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(
                                  color: _aiInnerTab == 1 ? AppTheme.primary : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                            ),
                            child: Text(
                              'Voice Agents',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: _aiInnerTab == 1 ? AppTheme.primary : AppTheme.charcoalMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _aiInnerTab == 0
                      ? _buildAICallLogsList(adminProvider)
                      : _buildAIAgentsList(adminProvider),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // AI INNER TAB 0: CALL LOGS
  Widget _buildAICallLogsList(AdminProvider adminProvider) {
    if (adminProvider.isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }
    if (adminProvider.aiCallsList.isEmpty) {
      return const Center(child: Text('No AI voice call logs.'));
    }

    return ListView.builder(
      itemCount: adminProvider.aiCallsList.length,
      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
      itemBuilder: (context, index) {
        final call = adminProvider.aiCallsList[index];
        final duration = call['duration'] ?? 0;
        final status = (call['status'] ?? 'completed').toString().toLowerCase();

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Caller: ${call['phone'] ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: status == 'completed' ? Colors.green.shade50 : Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: status == 'completed' ? Colors.green.shade700 : Colors.amber.shade700,
                        ),
                      ),
                    )
                  ],
                ),
                const Divider(height: 16),
                Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('Duration: $duration sec', style: const TextStyle(fontSize: 12, color: AppTheme.charcoal)),
                    const Spacer(),
                    Text(_formatDate(call['created_at']), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
                if (call['transcription'] != null && call['transcription'].toString().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Transcription: "${call['transcription']}"',
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.charcoalMuted),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  // AI INNER TAB 1: VOICE AGENTS
  Widget _buildAIAgentsList(AdminProvider adminProvider) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Voice Bots Config', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ElevatedButton.icon(
                onPressed: _showAIAgentDialog,
                icon: const Icon(Icons.add, size: 16, color: Colors.white),
                label: const Text('Add Agent'),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              ),
            ],
          ),
        ),
        Expanded(
          child: adminProvider.isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
              : adminProvider.aiAgentsList.isEmpty
                  ? const Center(child: Text('No AI voice agents configured.'))
                  : ListView.builder(
                      itemCount: adminProvider.aiAgentsList.length,
                      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                      itemBuilder: (context, index) {
                        final agent = adminProvider.aiAgentsList[index];
                        final isActive = agent['is_active'] == true;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: AppTheme.stone),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      agent['agent_name'] ?? 'Assistant',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isActive ? Colors.green.shade50 : Colors.grey.shade100,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        isActive ? 'ACTIVE' : 'INACTIVE',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isActive ? Colors.green.shade700 : Colors.grey.shade600,
                                        ),
                                      ),
                                    )
                                  ],
                                ),
                                const Divider(height: 16),
                                Text('Voice: ${agent['voice_type']} (${agent['language']})', style: const TextStyle(fontSize: 13)),
                                const SizedBox(height: 4),
                                Text(
                                  'Greeting: "${agent['greeting_message']}"',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700, fontStyle: FontStyle.italic),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    if (!isActive) ...[
                                      TextButton.icon(
                                        onPressed: () async {
                                          final success = await adminProvider.activateAIAgent(agent['agent_id']);
                                          if (success && context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(content: Text('Agent ${agent['agent_name']} activated!')),
                                            );
                                            _loadData();
                                          }
                                        },
                                        icon: const Icon(Icons.check_circle_outline, size: 18, color: Colors.green),
                                        label: const Text('Set Active', style: TextStyle(color: Colors.green)),
                                      ),
                                      const SizedBox(width: 8),
                                    ],
                                    TextButton.icon(
                                      onPressed: () {
                                        showDialog(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            title: const Text('Delete Agent?'),
                                            content: Text('Delete AI call agent ${agent['agent_name']}?'),
                                            actions: [
                                              TextButton(
                                                onPressed: () => Navigator.pop(context),
                                                child: const Text('Cancel'),
                                              ),
                                              TextButton(
                                                onPressed: () async {
                                                  final success = await adminProvider.deleteAIAgent(agent['agent_id']);
                                                  if (context.mounted) {
                                                    Navigator.pop(context);
                                                    if (success) {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        const SnackBar(content: Text('AI Call Agent deleted.')),
                                                      );
                                                      _loadData();
                                                    }
                                                  }
                                                },
                                                child: const Text('Delete', style: TextStyle(color: Colors.red)),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                      icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                                      label: const Text('Delete', style: TextStyle(color: Colors.red)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  // --- STATS OVERVIEW TAB (RE-DESIGNED TO REPLICATE IMAGE 1 EXACTLY) ---
  Widget _buildWebOverviewStats(Map<String, dynamic> stats) {
    final users = stats['users'] ?? {};
    final props = stats['properties'] ?? {};
    final bookings = stats['bookings'] ?? {};
    final revenue = stats['revenue'] ?? {};

    // Calculate revenue display
    final double revenueVal = (revenue['total'] ?? 0.0) / 100.0;
    final String formattedRevenue = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 0,
    ).format(revenueVal);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Grid of 4 Cards (Total Users, Total Properties, Total Bookings, Total Revenue)
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.25, // Sleek landscape-oriented cards
          children: [
            _buildWebCard(
              icon: Icons.people_outline,
              iconColor: AppTheme.primary,
              value: '${users['total'] ?? 0}',
              label: 'Total Users',
              subtext: '${users['hosts'] ?? 0} Hosts, ${users['guests'] ?? 0} Guests',
            ),
            _buildWebCard(
              icon: Icons.apartment_outlined,
              iconColor: Colors.green.shade700,
              value: '${props['total'] ?? 0}',
              label: 'Total Properties',
              subtext: '${props['live'] ?? 0} Live',
            ),
            _buildWebCard(
              icon: Icons.calendar_today_outlined,
              iconColor: Colors.blue.shade700,
              value: '${bookings['total'] ?? 0}',
              label: 'Total Bookings',
              subtext: '${bookings['confirmed'] ?? 0} Confirmed',
            ),
            _buildWebCard(
              icon: Icons.currency_rupee_outlined,
              iconColor: Colors.amber.shade800,
              value: formattedRevenue,
              label: 'Total Revenue',
              subtext: 'Gross Merchandise Value',
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Properties Pending Verification Banner (Redesigned as compact Row)
        _buildPendingBanner(
          icon: Icons.info_outline,
          iconColor: Colors.amber.shade800,
          title: '${props['pending_verification'] ?? 0} Properties Pending',
          subtitle: 'Review and approve pending listings',
          onPressed: () {
            setState(() {
              _tabController.index = 2; // Switch to Properties tab
            });
          },
        ),
        const SizedBox(height: 10),

        // Host Profiles Pending KYC Verification Banner (Redesigned as compact Row)
        _buildPendingBanner(
          icon: Icons.info_outline,
          iconColor: Colors.amber.shade800,
          title: '${users['pending_kyc'] ?? 0} KYC Profiles Pending',
          subtitle: 'Verify host identity documents',
          onPressed: () {
            setState(() {
              _selectedRole = 'Host';
              _tabController.index = 1; // Switch to Users tab
            });
            Provider.of<AdminProvider>(context, listen: false).getUsers(role: 'Host', search: _searchController.text);
          },
        ),
        const SizedBox(height: 20),

        // Quick Actions Section
        const Text(
          'Quick Actions',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.people_outline,
                label: 'Manage Users',
                onPressed: () {
                  setState(() {
                    _tabController.index = 1;
                  });
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.apartment_outlined,
                label: 'Review Props',
                onPressed: () {
                  setState(() {
                    _tabController.index = 2;
                  });
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.edit_note_outlined,
                label: 'Edit CMS',
                onPressed: () {
                  setState(() {
                    _tabController.index = 5;
                  });
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildWebCard({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
    required String subtext,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone, width: 1),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: iconColor, size: 24),
              const Icon(Icons.arrow_forward_ios_outlined, color: AppTheme.stone, size: 10),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
          ),
          const SizedBox(height: 2),
          Text(
            subtext,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 9, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingBanner({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone, width: 1),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton(
            onPressed: onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              elevation: 0,
            ),
            child: const Text('Review', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
  }) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.stone, width: 1),
        ),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppTheme.primary, size: 22),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
            ),
          ],
        ),
      ),
    );
  }

  // --- FILTERS & HEADER BAR FOR USERS TAB ---
  Widget _buildUserFiltersSection() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: const BoxDecoration(
        color: AppTheme.white,
        border: Border(bottom: BorderSide(color: AppTheme.stone)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'User Management',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold, fontSize: 18),
                ),
              ),
              ElevatedButton.icon(
                onPressed: () => _showUserFormDialog(),
                icon: const Icon(Icons.add, size: 16, color: Colors.white),
                label: const Text('Add User'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search, size: 18),
                    hintText: 'Search email, phone, name...',
                    contentPadding: EdgeInsets.symmetric(vertical: 8.0),
                  ),
                  onChanged: (val) {
                    Provider.of<AdminProvider>(context, listen: false).getUsers(role: _selectedRole, search: val);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String>(
                  value: _selectedRole,
                  decoration: const InputDecoration(
                    contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'All', child: Text('All Roles')),
                    DropdownMenuItem(value: 'Admin', child: Text('Admin')),
                    DropdownMenuItem(value: 'Host', child: Text('Host')),
                    DropdownMenuItem(value: 'Guest', child: Text('Guest')),
                    DropdownMenuItem(value: 'Broker', child: Text('Broker')),
                    DropdownMenuItem(value: 'Employee', child: Text('Employee')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedRole = val;
                      });
                      Provider.of<AdminProvider>(context, listen: false).getUsers(role: val, search: _searchController.text);
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- BEAUTIFUL USER CARD MATCHING THE SCREENSHOT ---
  Widget _buildUserCard(Map<String, dynamic> user) {
    final isOnline = user['is_active'] == true;
    final role = (user['role'] ?? '').toString().toUpperCase();
    final kyc = (user['kyc_status'] ?? 'unverified').toString().toUpperCase();
    final uid = user['user_id'] ?? '';
    final city = user['city'] ?? 'N/A';
    final regTime = _formatDate(user['created_at']);

    // Theme values for badges
    Color roleBg = Colors.grey.shade100;
    Color roleText = Colors.grey.shade700;
    if (role == 'ADMIN') {
      roleBg = Colors.red.shade50;
      roleText = Colors.red.shade700;
    } else if (role == 'HOST') {
      roleBg = AppTheme.primary.withOpacity(0.08);
      roleText = AppTheme.primary;
    } else if (role == 'GUEST') {
      roleBg = Colors.blue.shade50;
      roleText = Colors.blue.shade700;
    } else if (role == 'BROKER') {
      roleBg = Colors.teal.shade50;
      roleText = Colors.teal.shade700;
    } else if (role == 'EMPLOYEE') {
      roleBg = Colors.purple.shade50;
      roleText = Colors.purple.shade700;
    }

    Color kycBg = Colors.red.shade50;
    Color kycText = Colors.red.shade700;
    if (kyc == 'APPROVED') {
      kycBg = Colors.green.shade50;
      kycText = Colors.green.shade700;
    } else if (kyc == 'PENDING') {
      kycBg = Colors.amber.shade50;
      kycText = Colors.amber.shade800;
    }

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12.0),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12.0),
        side: const BorderSide(color: AppTheme.stone, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppTheme.stone,
                      backgroundImage: user['profile_image'] != null
                          ? NetworkImage(
                              user['profile_image'].toString().startsWith('http')
                                  ? user['profile_image'].toString()
                                  : '${AppConfig.activeBaseUrl}${user['profile_image']}',
                            )
                          : null,
                      child: user['profile_image'] == null
                          ? Text(
                              (user['full_name'] ?? 'U')[0].toString().toUpperCase(),
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.charcoal, fontSize: 16),
                            )
                          : null,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 11,
                        height: 11,
                        decoration: BoxDecoration(
                          color: isOnline ? Colors.green : Colors.grey,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user['full_name'] ?? 'N/A',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${user['email'] ?? ''} | ${user['phone'] ?? ''}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                // Role Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: roleBg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    role,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: roleText),
                  ),
                ),
                // KYC Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: kycBg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'KYC: $kyc',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kycText),
                  ),
                ),
                // UID
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.stone,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'UID: $uid',
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
                  ),
                ),
                // City
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.stone,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'in $city',
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.access_time, size: 12, color: Colors.grey),
                const SizedBox(width: 4),
                Text(
                  'Registered: $regTime',
                  style: TextStyle(fontSize: 10.5, color: Colors.grey.shade600),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppTheme.stone),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                // View button
                IconButton(
                  icon: const Icon(Icons.visibility_outlined, size: 20, color: AppTheme.secondary),
                  onPressed: () => _showUserDetailsDialog(user),
                  tooltip: 'View Details & KYC',
                ),
                // Edit button
                IconButton(
                  icon: const Icon(Icons.edit_outlined, size: 20, color: Colors.blue),
                  onPressed: () => _showUserFormDialog(existingUser: user),
                  tooltip: 'Edit User',
                ),
                const SizedBox(width: 8),
                // Deactivate/Activate toggle
                OutlinedButton(
                  onPressed: () async {
                    final adminProv = Provider.of<AdminProvider>(context, listen: false);
                    final success = await adminProv.toggleUserStatus(user['user_id'], !isOnline);
                    if (success && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(isOnline ? 'User deactivated!' : 'User activated!')),
                      );
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isOnline ? Colors.red.shade700 : Colors.green.shade700,
                    side: BorderSide(color: isOnline ? Colors.red.shade200 : Colors.green.shade200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    minimumSize: const Size(60, 30),
                  ),
                  child: Text(
                    isOnline ? 'Deactivate' : 'Activate',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 8),
                // Delete button
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Delete User?'),
                        content: Text('Are you sure you want to permanently delete ${user['full_name']}? This action is irreversible.'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancel'),
                          ),
                          TextButton(
                            onPressed: () async {
                              final adminProv = Provider.of<AdminProvider>(context, listen: false);
                              final success = await adminProv.deleteUser(user['user_id']);
                              if (context.mounted) {
                                Navigator.pop(context);
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('User deleted successfully.')),
                                  );
                                }
                              }
                            },
                            child: const Text('Delete', style: TextStyle(color: Colors.red)),
                          ),
                        ],
                      ),
                    );
                  },
                  tooltip: 'Delete User',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccountTabChip(String label, int index) {
    final isSelected = _accountSubTab == index;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: isSelected ? Colors.white : AppTheme.charcoalMuted,
        ),
      ),
      selected: isSelected,
      selectedColor: AppTheme.primary,
      backgroundColor: Colors.grey.shade100,
      onSelected: (val) {
        setState(() {
          _accountSubTab = index;
        });
      },
    );
  }

  Widget _buildAccountSubTabContent(BuildContext context, AccountProvider accountProv) {
    switch (_accountSubTab) {
      case 0:
        return _buildAccountFinancialsView(accountProv);
      case 1:
        return _buildAccountLedgerView(accountProv);
      case 2:
        return _buildAccountPayoutsView(accountProv);
      case 3:
        return _buildAccountRefundsView(accountProv);
      case 4:
        return _buildAccountTopHostsView(accountProv);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildAccountFinancialsView(AccountProvider accountProv) {
    final overview = accountProv.overviewData;
    final rev = overview['revenue'] ?? {};
    final counts = overview['counts'] ?? {};
    final pending = overview['pending_payouts'] ?? {};

    final double gross = (rev['total_gross_paise'] ?? 0) / 100.0;
    final double platform = (rev['platform_take_paise'] ?? 0) / 100.0;
    final double paidPayouts = (rev['payouts_paid_paise'] ?? 0) / 100.0;
    final double tax = (rev['total_tax_paise'] ?? 0) / 100.0;
    final double bookingPayments = (rev['booking_payments_paise'] ?? 0) / 100.0;
    final double regFees = (rev['registration_fees_paise'] ?? 0) / 100.0;
    final double subRevenue = (rev['subscriptions_paise'] ?? 0) / 100.0;
    final double refunds = (rev['refunds_paise'] ?? 0) / 100.0;

    final double pendingAmt = (pending['amount_paise'] ?? 0) / 100.0;
    final int pendingCount = pending['count'] ?? 0;

    final currencyFmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        // Grid of 8 Stats Cards
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.25,
          children: [
            _buildFinCardPremium(
              title: 'TOTAL GROSS REVENUE',
              amount: currencyFmt.format(gross),
              icon: Icons.currency_rupee,
            ),
            _buildFinCardPremium(
              title: 'PLATFORM FEE',
              amount: currencyFmt.format(platform),
              icon: Icons.trending_up,
            ),
            _buildFinCardPremium(
              title: 'HOST PAYOUTS',
              amount: currencyFmt.format(paidPayouts),
              icon: Icons.account_balance_wallet_outlined,
              extraWidget: _buildPendingStatus(pendingAmt),
              subtitle: '$pendingCount pending payout',
            ),
            _buildFinCardPremium(
              title: 'TAX',
              amount: currencyFmt.format(tax),
              icon: Icons.sync,
            ),
            _buildFinCardPremium(
              title: 'BOOKING PAYMENTS',
              amount: currencyFmt.format(bookingPayments),
              icon: Icons.currency_rupee,
              subtitle: '${counts['booking_payments'] ?? 0} bookings',
            ),
            _buildFinCardPremium(
              title: 'REGISTRATION FEES',
              amount: currencyFmt.format(regFees),
              icon: Icons.check_circle_outline,
              subtitle: '${counts['registration_fees'] ?? 0} hosts',
            ),
            _buildFinCardPremium(
              title: 'SUBSCRIPTION REVENUE',
              amount: currencyFmt.format(subRevenue),
              icon: Icons.sync,
              subtitle: '${counts['subscriptions'] ?? 0} subs',
            ),
            _buildFinCardPremium(
              title: 'REFUNDS ISSUED',
              amount: currencyFmt.format(refunds),
              icon: Icons.cancel_outlined,
              subtitle: '${counts['refunds'] ?? 0} refunds',
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Line Chart Section
        _buildRevenueTrendChart(accountProv),
        const SizedBox(height: 100),
      ],
    );
  }

  Widget _buildPendingStatus(double pendingAmt) {
    final currencyFmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: const BoxDecoration(
            color: Colors.orange,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          'Pending: ${currencyFmt.format(pendingAmt)}',
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.bold,
            color: Colors.orange,
          ),
        ),
      ],
    );
  }

  Widget _buildFinCardPremium({
    required String title,
    required String amount,
    required IconData icon,
    String? subtitle,
    Widget? extraWidget,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone.withOpacity(0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.charcoalMuted,
                        letterSpacing: 0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (extraWidget != null) ...[
                      extraWidget,
                      const SizedBox(height: 2),
                    ],
                    Text(
                      amount,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.charcoal,
                      ),
                    ),
                  ],
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 9,
                    color: Colors.grey.shade500,
                  ),
                ),
            ],
          ),
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: Color(0xFFFBEBE8),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: AppTheme.primary,
                size: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueTrendChart(AccountProvider accountProv) {
    final chartData = accountProv.mrrChartData;
    if (chartData.isEmpty) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.stone),
        ),
        child: const Center(
          child: Text('No trend data available'),
        ),
      );
    }

    final double maxVal = chartData.fold<double>(10000.0, (prev, element) {
      final double inflow = (element['inflow_paise'] ?? 0) / 100.0;
      final double refunds = (element['refund_paise'] ?? 0) / 100.0;
      final double net = (element['net_paise'] ?? 0) / 100.0;
      double currentMax = inflow > refunds ? inflow : refunds;
      if (net > currentMax) currentMax = net;
      return currentMax > prev ? currentMax : prev;
    }) * 1.15; // 15% padding

    List<FlSpot> inflowSpots = [];
    List<FlSpot> refundSpots = [];
    List<FlSpot> netSpots = [];

    for (int i = 0; i < chartData.length; i++) {
      final item = chartData[i];
      final double inflow = (item['inflow_paise'] ?? 0) / 100.0;
      final double refunds = (item['refund_paise'] ?? 0) / 100.0;
      final double net = (item['net_paise'] ?? 0) / 100.0;
      inflowSpots.add(FlSpot(i.toDouble(), inflow));
      refundSpots.add(FlSpot(i.toDouble(), refunds));
      netSpots.add(FlSpot(i.toDouble(), net));
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Revenue trend (last 6 months)',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 220,
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: 20000,
                ),
                titlesData: FlTitlesData(
                  show: true,
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      interval: 1,
                      getTitlesWidget: (value, meta) {
                        final int index = value.toInt();
                        if (index >= 0 && index < chartData.length) {
                          final label = chartData[index]['label'] ?? '';
                          return SideTitleWidget(
                            axisSide: meta.axisSide,
                            child: Text(
                              label,
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 8),
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        return SideTitleWidget(
                          axisSide: meta.axisSide,
                          child: Text(
                            '₹${(value / 1000).toStringAsFixed(0)}k',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 8),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(
                  show: true,
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade200, width: 1),
                    left: BorderSide(color: Colors.grey.shade200, width: 1),
                  ),
                ),
                minX: 0,
                maxX: (chartData.length - 1).toDouble(),
                minY: 0,
                maxY: maxVal,
                lineBarsData: [
                  LineChartBarData(
                    spots: inflowSpots,
                    isCurved: true,
                    color: AppTheme.primary,
                    barWidth: 2,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(show: false),
                  ),
                  LineChartBarData(
                    spots: refundSpots,
                    isCurved: true,
                    color: Colors.teal,
                    barWidth: 2,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(show: false),
                  ),
                  LineChartBarData(
                    spots: netSpots,
                    isCurved: true,
                    color: AppTheme.charcoal,
                    barWidth: 2,
                    isStrokeCapRound: true,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(show: false),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Legend
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildLegendItem('Inflow', AppTheme.primary),
              const SizedBox(width: 16),
              _buildLegendItem('Refunds', Colors.teal),
              const SizedBox(width: 16),
              _buildLegendItem('Net', AppTheme.charcoal),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
        ),
      ],
    );
  }

  Widget _buildAccountLedgerView(AccountProvider accountProv) {
    final txns = accountProv.transactions;

    if (txns.isEmpty) {
      return const Center(child: Text('No transactions found in ledger.'));
    }

    return ListView.builder(
      itemCount: txns.length,
      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
      itemBuilder: (context, index) {
        final txn = txns[index];
        final id = txn['transaction_id'] ?? '';
        final type = (txn['type'] ?? 'payment').toString().replaceAll('_', ' ').toUpperCase();
        final status = (txn['status'] ?? 'pending').toString().toUpperCase();
        final amount = (txn['amount'] ?? 0) / 100.0;
        final dateStr = _formatDate(txn['created_at']);
        final user = txn['user'];

        Color statusColor = Colors.orange;
        if (status == 'SUCCESS') statusColor = Colors.green;
        if (status == 'FAILED') statusColor = Colors.red;

        final isOutflow = txn['type'] == 'refund' || txn['type'] == 'payout';
        final amtText = '${isOutflow ? "-" : "+"} ₹${amount.toStringAsFixed(2)}';
        final amtColor = isOutflow ? Colors.red.shade700 : Colors.green.shade700;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'TXN: $id',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.charcoalMuted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(type, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal)),
                        const SizedBox(height: 4),
                        Text(dateStr, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                      ],
                    ),
                    Text(
                      amtText,
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: amtColor),
                    ),
                  ],
                ),
                if (user != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.person_outline, size: 14, color: AppTheme.charcoalMuted),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'User: ${user['full_name'] ?? ''} (${user['email'] ?? ''})',
                            style: const TextStyle(fontSize: 11, color: AppTheme.charcoal),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => _showShareInvoiceDialog(id),
                      icon: const Icon(Icons.share, size: 14),
                      label: const Text('Share Invoice', style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAccountPayoutsView(AccountProvider accountProv) {
    final payouts = accountProv.payouts;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Host Payout Requests',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    icon: const Icon(Icons.sync_alt, size: 14),
                    label: const Text('Sweep', style: TextStyle(fontSize: 11)),
                    onPressed: _triggerPayoutSweep,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.play_arrow, size: 14),
                    label: const Text('Process All', style: TextStyle(fontSize: 11)),
                    onPressed: _processAllEligiblePayouts,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: payouts.isEmpty
              ? const Center(child: Text('No payout records found.'))
              : ListView.builder(
                  itemCount: payouts.length,
                  padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
                  itemBuilder: (context, index) {
                    final payout = payouts[index];
                    final pid = payout['payout_id'] ?? '';
                    final hostName = payout['host']?['full_name'] ?? payout['host_id'] ?? 'Host';
                    final hostEmail = payout['host']?['email'] ?? '';
                    final pref = payout['host']?['payout_preference'] ?? {};
                    final propTitle = payout['property']?['title'] ?? 'Listing Payout';
                    final netAmount = (payout['net_amount'] ?? payout['amount'] ?? 0) / 100.0;
                    final status = (payout['status'] ?? 'eligible').toString().toUpperCase();
                    final eligibleDate = _formatDate(payout['eligible_at']);

                    Color statusColor = Colors.orange;
                    if (status == 'PAID') statusColor = Colors.green;
                    if (status == 'FAILED') statusColor = Colors.red;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppTheme.stone),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('PAYOUT ID: $pid', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppTheme.charcoalMuted)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    status,
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                                  ),
                                )
                              ],
                            ),
                            const Divider(height: 16),
                            Text(propTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text('Host: $hostName ($hostEmail)', style: const TextStyle(fontSize: 12)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.calendar_today, size: 12, color: Colors.grey),
                                const SizedBox(width: 4),
                                Text('Eligible: $eligibleDate', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              ],
                            ),
                            const SizedBox(height: 8),

                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'PAYMENT DETAILS',
                                    style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: AppTheme.charcoalMuted),
                                  ),
                                  const SizedBox(height: 4),
                                  if (pref['upi_id'] != null && pref['upi_id'].toString().isNotEmpty) ...[
                                    Text('UPI ID: ${pref['upi_id']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ] else if (pref['bank_account_number'] != null) ...[
                                    Text('Holder: ${pref['bank_account_holder'] ?? '—'}', style: const TextStyle(fontSize: 11)),
                                    Text('A/C: ${pref['bank_account_number']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                    Text('Bank: ${pref['bank_name'] ?? '—'} | IFSC: ${pref['bank_ifsc'] ?? '—'}', style: const TextStyle(fontSize: 11)),
                                  ] else ...[
                                    const Text('No payout preference specified', style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.red)),
                                  ],
                                ],
                              ),
                            ),

                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Net Payout Amount', style: TextStyle(fontSize: 10, color: AppTheme.charcoalMuted)),
                                    Text(
                                      '₹${netAmount.toStringAsFixed(2)}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.secondary),
                                    ),
                                  ],
                                ),
                                if (status == 'ELIGIBLE') ...[
                                  ElevatedButton(
                                    onPressed: () async {
                                      final confirm = await showDialog<bool>(
                                        context: context,
                                        builder: (context) => AlertDialog(
                                          title: const Text('Process Payout?'),
                                          content: Text('Are you sure you want to process the payout of ₹${netAmount.toStringAsFixed(2)} to $hostName?'),
                                          actions: [
                                            TextButton(
                                              onPressed: () => Navigator.pop(context, false),
                                              child: const Text('Cancel'),
                                            ),
                                            TextButton(
                                              onPressed: () => Navigator.pop(context, true),
                                              child: const Text('Process'),
                                            ),
                                          ],
                                        ),
                                      );
                                      if (confirm == true) {
                                        final success = await accountProv.processPayout(pid);
                                        if (context.mounted) {
                                          if (success) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(content: Text('Payout processed successfully!'), backgroundColor: Colors.green),
                                            );
                                          } else {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(content: Text('Failed to process payout.'), backgroundColor: Colors.red),
                                            );
                                          }
                                        }
                                      }
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.green.shade700,
                                      foregroundColor: Colors.white,
                                    ),
                                    child: const Text('Process'),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Future<void> _triggerPayoutSweep() async {
    try {
      final response = await ApiService().dio.post('/admin/account/payouts/sweep-eligibility');
      if (response.statusCode == 200) {
        final count = response.data['count'] ?? 0;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Sweep completed. Marked $count bookings as eligible.'), backgroundColor: Colors.green),
          );
        }
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sweep failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _processAllEligiblePayouts() async {
    try {
      final response = await ApiService().dio.post('/admin/account/payouts/process-eligible');
      if (response.statusCode == 200) {
        final processed = response.data['processed'] ?? 0;
        final failed = response.data['failed'] ?? 0;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Batch processing done. Processed: $processed, Failed: $failed'), backgroundColor: Colors.green),
          );
        }
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Processing failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showShareInvoiceDialog(String transactionId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Share Invoice'),
        content: const Text('Choose a channel to share the invoice with the user:'),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.email_outlined),
            label: const Text('Email'),
            onPressed: () async {
              Navigator.pop(context);
              final success = await _shareInvoice(transactionId, 'email');
              if (success && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Invoice shared successfully via Email.'), backgroundColor: Colors.green),
                );
              }
            },
          ),
          TextButton.icon(
            icon: const Icon(Icons.message_outlined),
            label: const Text('WhatsApp'),
            onPressed: () async {
              Navigator.pop(context);
              final success = await _shareInvoice(transactionId, 'whatsapp');
              if (success && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Invoice shared successfully via WhatsApp.'), backgroundColor: Colors.green),
                );
              }
            },
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Future<bool> _shareInvoice(String transactionId, String channel) async {
    try {
      final response = await ApiService().dio.post(
        '/admin/account/transactions/$transactionId/share-invoice',
        data: {'channel': channel},
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to share invoice: $e'), backgroundColor: Colors.red),
        );
      }
      return false;
    }
  }

  Widget _buildAccountRefundsView(AccountProvider accountProv) {
    final txns = accountProv.transactions.where((t) => t['type'] == 'refund').toList();

    if (txns.isEmpty) {
      return const Center(child: Text('No refund records found.'));
    }

    return ListView.builder(
      itemCount: txns.length,
      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
      itemBuilder: (context, index) {
        final txn = txns[index];
        final id = txn['transaction_id'] ?? '';
        final status = (txn['status'] ?? 'pending').toString().toUpperCase();
        final amount = (txn['amount'] ?? 0) / 100.0;
        final dateStr = _formatDate(txn['created_at']);
        final user = txn['user'];

        Color statusColor = Colors.orange;
        if (status == 'SUCCESS') statusColor = Colors.green;
        if (status == 'FAILED') statusColor = Colors.red;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'REFUND ID: $id',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppTheme.charcoalMuted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('REFUND ISSUED', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal)),
                        const SizedBox(height: 4),
                        Text(dateStr, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                      ],
                    ),
                    Text(
                      '- ₹${amount.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.red),
                    ),
                  ],
                ),
                if (user != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.person_outline, size: 14, color: AppTheme.charcoalMuted),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Refunded To: ${user['full_name'] ?? ''} (${user['email'] ?? ''})',
                            style: const TextStyle(fontSize: 11, color: AppTheme.charcoal),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAccountTopHostsView(AccountProvider accountProv) {
    final hosts = accountProv.topHosts;

    if (hosts.isEmpty) {
      return const Center(child: Text('No host earnings data found.'));
    }

    final currencyFmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

    return ListView.builder(
      itemCount: hosts.length,
      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0, bottom: 100.0),
      itemBuilder: (context, index) {
        final host = hosts[index];
        final name = host['full_name'] ?? 'Host';
        final email = host['email'] ?? '';
        final city = host['city'] ?? 'N/A';
        final double gross = (host['gross_paise'] ?? 0) / 100.0;
        final bookingsCount = host['bookings'] ?? 0;
        final rank = index + 1;

        Color medalColor = Colors.grey.shade400;
        if (rank == 1) medalColor = const Color(0xFFFFD700); // Gold
        if (rank == 2) medalColor = const Color(0xFFC0C0C0); // Silver
        if (rank == 3) medalColor = const Color(0xCD7F3200); // Bronze

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: rank <= 3 ? medalColor.withOpacity(0.2) : Colors.grey.shade100,
              child: Text(
                '#$rank',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: rank <= 3 ? medalColor : Colors.grey.shade600,
                ),
              ),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('$email • $city\n$bookingsCount bookings processed', style: const TextStyle(fontSize: 11)),
            trailing: Text(
              currencyFmt.format(gross),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.green),
            ),
            isThreeLine: true,
          ),
        );
      },
    );
  }
}
