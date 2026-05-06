# PropNest STR Platform - Product Requirements Document (PRD)

## Project Overview
PropNest is a comprehensive Short-Term Rental (STR) platform for the Indian market, connecting Property Owners (Hosts), Guests (Renters), Brokers, and Employees (Relationship Managers) under a unified system managed by Super Admin.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Payment**: Razorpay (test mode configured)
- **OTP/SMS**: MSG91 (configured, mocked for development)
- **Cache**: Redis (for OTP storage)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

### Frontend
- **Framework**: React.js
- **Routing**: React Router v7
- **Styling**: Tailwind CSS + Custom design system
- **UI Components**: Shadcn/UI (available)
- **State Management**: React Context API
- **HTTP Client**: Axios

### Design System
- **Theme**: Light, Organic & Earthy archetype
- **Primary Color**: Terracotta (#C05C4F)
- **Secondary Color**: Sage (#788574)
- **Background**: Warm Sand (#FDFCF8)
- **Typography**: Manrope (all weights)

## Implemented Features (Phase 1)

### 1. Authentication & User Management
- [x] User Registration with phone OTP verification
- [x] Login with email/password
- [x] JWT-based authentication
- [x] Role-based access control (Guest, Host, Broker, Employee, Admin)
- [x] Protected routes based on user role
- [x] Context-based auth state management

### 2. User Roles Implemented
- [x] Guest/Renter - Browse properties, make bookings
- [x] Host/Owner - List properties, manage bookings
- [x] Broker - (Dashboard placeholder created)
- [x] Employee/RM - (Dashboard placeholder created)
- [x] Admin - (Dashboard placeholder created)

### 3. Property Management
- [x] Property listing creation (Host)
- [x] Property search with filters (category, city, price, BHK, amenities)
- [x] Property details view
- [x] Property status management (draft, pending_verification, live, rejected)
- [x] Host can view all their properties
- [x] Submit property for verification

### 4. Booking System
- [x] Create booking with date selection
- [x] Soft lock (10-minute hold on property)
- [x] Hard lock after payment confirmation
- [x] Booking overlap prevention (double-booking protection)
- [x] Pricing calculation (base + service fee + taxes)
- [x] Guest can view their bookings
- [x] Host can view bookings for their properties

### 5. Payment Integration (Razorpay)
- [x] Create Razorpay order for bookings
- [x] Payment signature verification
- [x] Payment confirmation flow
- [x] Test mode configuration

### 6. OTP Service
- [x] Generate and store OTP in Redis (with fallback to in-memory)
- [x] Send OTP for phone verification
- [x] Verify OTP with attempt tracking
- [x] OTP expiry and rate limiting

### 7. UI/UX Implementation
- [x] Beautiful landing page with hero section
- [x] Featured properties display
- [x] Category exploration
- [x] Professional authentication page with login/register
- [x] Guest property browse page with search
- [x] Host dashboard with property management
- [x] Responsive design (mobile-first)
- [x] Design system with Manrope font and terracotta/sage colors

## Pending Features (Phase 2)

### Property Management
- [ ] Property image upload to cloud storage
- [ ] Property calendar management with blocked dates
- [ ] iCal sync for external calendars
- [ ] Property editing and updates
- [ ] 360° virtual tour integration
- [ ] Amenities checklist expansion

### Subscription System
- [ ] BHK-wise subscription plans (Studio, 1BHK, 2BHK, 3BHK, etc.)
- [ ] 3-month free trial activation
- [ ] Subscription payment via Razorpay
- [ ] Renewal reminders (5 days before expiry)
- [ ] Auto-renewal with Razorpay subscriptions

### Host Registration Fee
- [ ] ₹500 registration fee pop-up after registration
- [ ] Payment via Razorpay
- [ ] Fee refund if property not approved within 30 days

### Broker Dashboard (Golden Rich Properties)
- [ ] SSO integration with GRP portal
- [ ] View all assigned owners
- [ ] Property verification tasks
- [ ] Physical site visit checklist
- [ ] Geo-tagged photo upload
- [ ] Leads management
- [ ] Commission tracking (view only)
- [ ] Subscription alerts

### Employee (RM) Dashboard
- [ ] Remote property verification review
- [ ] View verification checklist and geo-tagged photos
- [ ] Approve/Reject properties
- [ ] Broker oversight
- [ ] Reports generation (Properties Not Booked, etc.)
- [ ] Export reports to PDF/CSV

### Admin Panel
- [ ] User management (view, edit, suspend, delete)
- [ ] KYC approval/rejection
- [ ] Property listing moderation
- [ ] Final approve/reject authority
- [ ] Booking management
- [ ] Account section (payments, subscriptions, payouts, commissions)
- [ ] Landing page CMS
- [ ] Analytics & reporting dashboard
- [ ] Subscription plan management
- [ ] Pricing configuration

### Notifications
- [ ] MSG91 SMS integration
- [ ] MSG91 WhatsApp integration
- [ ] Email notifications (mocked for now)
- [ ] In-app notification center
- [ ] Booking confirmation notifications
- [ ] Subscription reminder notifications

### Calendar & Availability
- [ ] Interactive calendar on property page
- [ ] Blocked dates visualization
- [ ] iCal import/export
- [ ] Unified calendar view for hosts
- [ ] Booking overlap prevention (already implemented at DB level)

### Reviews & Ratings
- [ ] 5-star rating system
- [ ] Sub-category scores (Cleanliness, Communication, Location, Value)
- [ ] 14-day review window after checkout
- [ ] Reviews display on property page

### Advanced Features
- [ ] OpenAI GPT-5.2 integration for smart property descriptions
- [ ] AI-powered search recommendations
- [ ] Chatbot support
- [ ] Google Maps integration for property location
- [ ] Search with map view
- [ ] Razorpay Payout API for host payouts

## Database Collections

### users
- user_id, email, phone, password_hash, full_name, role
- city, profile_image
- lg_code, broker_id (for hosts)
- region (for brokers)
- employee_region (for employees)
- kyc_status, kyc_documents
- registration_fee_paid, terms_accepted
- is_active, is_email_verified, is_phone_verified
- created_at, updated_at

### properties
- property_id, owner_id, broker_id
- title, description, property_type, category, bhk_type
- address, city, state, pin_code, latitude, longitude
- area_sqft
- price_per_night, price_per_week, price_per_month, minimum_stay_days
- amenities[], images[], virtual_tour_link
- house_rules, pet_friendly, smoking_allowed, instant_booking
- status, verification_remarks
- blocked_dates[]
- subscription_id, subscription_status
- created_at, updated_at, submitted_at, approved_at

### bookings
- booking_id, property_id, guest_id, host_id
- check_in_date, check_out_date, number_of_guests
- base_amount, service_fee, taxes, total_amount
- payment_status, razorpay_order_id, razorpay_payment_id
- booking_status, cancellation_policy
- security_deposit, security_deposit_refunded
- created_at, updated_at, confirmed_at, cancelled_at, soft_lock_expires_at

### subscriptions
- subscription_id, user_id, property_id, plan_id
- plan_type, billing_cycle, amount
- status, start_date, end_date, trial_end_date
- razorpay_subscription_id, auto_renewal
- created_at, updated_at, cancelled_at

### subscription_plans
- plan_id, plan_type, plan_name
- price_monthly, price_annual, description
- is_active, created_at

## API Endpoints Implemented

### Authentication
- POST /api/auth/send-otp - Send OTP to phone
- POST /api/auth/verify-otp - Verify OTP
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user

### Properties
- POST /api/properties/ - Create property (Host)
- GET /api/properties/search - Search properties (public)
- GET /api/properties/{property_id} - Get property details
- GET /api/properties/host/my-properties - Get host's properties
- PATCH /api/properties/{property_id} - Update property
- POST /api/properties/{property_id}/submit-verification - Submit for verification

### Bookings
- POST /api/bookings/ - Create booking (with Razorpay order)
- POST /api/bookings/confirm-payment - Confirm payment
- GET /api/bookings/guest/my-bookings - Get guest's bookings
- GET /api/bookings/host/my-bookings - Get host's bookings
- GET /api/bookings/{booking_id} - Get booking details

### Health
- GET /api/health - Health check
- GET /api/ - API info

## Environment Configuration

### Backend (.env)
- MONGO_URL - MongoDB connection string
- DB_NAME - Database name
- JWT_SECRET_KEY - JWT signing key
- RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET - Payment gateway
- MSG91_AUTHKEY, MSG91_SENDER_ID - SMS/WhatsApp
- EMERGENT_LLM_KEY - OpenAI access
- REDIS_URL - Cache storage
- REGISTRATION_FEE_AMOUNT - Host registration fee (in paise)

### Frontend (.env)
- REACT_APP_BACKEND_URL - Backend API URL

## Next Steps

1. **Complete Admin Panel** - Full implementation with CMS and analytics
2. **Broker Workflow** - SSO, verification tasks, leads management
3. **Employee Dashboard** - Verification review, reports, broker oversight
4. **Subscription System** - Plans, payments, renewals
5. **Notification System** - MSG91 SMS/WhatsApp integration
6. **Calendar Integration** - iCal sync, availability management
7. **Review System** - Ratings, reviews, feedback
8. **Advanced Search** - Map integration, filters enhancement
9. **AI Features** - Smart descriptions, chatbot, recommendations
10. **Testing** - Comprehensive testing of all flows

## Current Status
- ✅ Core authentication and authorization complete
- ✅ Property management foundation ready
- ✅ Booking system with payment integration working
- ✅ Beautiful UI with design system implemented
- ✅ Guest and Host roles functional
- ⏳ Admin, Broker, Employee dashboards need full implementation
- ⏳ Notification system needs real integration
- ⏳ Subscription system needs implementation
