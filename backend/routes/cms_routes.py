from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, status, Depends, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.cms import CMSContent, CMSUpdate, HeroSection
from middleware.auth_middleware import get_current_user
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cms", tags=["CMS"])

HOST_AGREEMENT_TEXT = """## SHORT-TERM RENTAL HOST AGREEMENT

This Short-Term Rental Host Agreement ("Agreement") is executed between **X-Space360 / Golden Rich Financial & Real Estate Solutions Private Limited** ("Platform") and the property owner or authorized host ("Host") for listing, promotion, booking facilitation, and guest coordination services through the X-Space360 platform.

### 1. Appointment and Listing Authorization
The Host appoints X-Space360 on a non-exclusive basis to display, promote, and facilitate bookings for the Host's property/properties. The Host confirms that all property information, photographs, documents, amenities, pricing, availability, and location details submitted to X-Space360 are true, complete, current, and not misleading.

### 2. Ownership, Authority, and Compliance
The Host represents that they are the lawful owner, lessee, manager, or duly authorized representative of the listed property and have full authority to enter into this Agreement. The Host shall remain responsible for all licenses, permissions, society approvals, statutory registrations, tax obligations, safety requirements, and local law compliance applicable to short-term rental operations.

### 3. Platform Role and Services
X-Space360 acts as a technology-enabled marketplace and service facilitator. The Platform may assist with listing visibility, guest discovery, booking coordination, guest verification, payment facilitation, support, and operational communication. X-Space360 does not assume ownership, possession, tenancy, or direct control of the Host's property.

### 4. Host Duties and Property Standards
The Host shall maintain the property in a clean, safe, functional, guest-ready, and legally compliant condition. The Host agrees to provide accurate check-in instructions, honor confirmed bookings, maintain promised amenities, respond to platform communications, and ensure that guests receive the accommodation and services represented in the listing.

### 5. Payments, Charges, and Deductions
The Host authorizes X-Space360 to collect or facilitate collection of booking amounts, applicable platform fees, subscription fees, taxes, penalties, refunds, adjustments, and other lawful deductions as per platform policy. Net payouts, where applicable, shall be processed after deducting platform charges, commissions, taxes, refunds, disputes, or other applicable amounts.

### 6. Cancellations, Refunds, and Guest Issues
The Host agrees to comply with X-Space360 cancellation, refund, guest grievance, and dispute resolution policies. X-Space360 may withhold or adjust payouts where bookings are cancelled, services are not delivered, guest claims are verified, property standards are breached, or legal/policy violations are identified.

### 7. Documents, Verification, and Declarations
The Host shall submit valid KYC, ownership, bank, tax, and other verification documents requested by X-Space360. The Host confirms that all submitted details are genuine and authorizes X-Space360 to verify documents and information with internal teams, third-party vendors, government sources, banks, brokers, employees, or other lawful channels.

### 8. Indemnity and Liability
The Host shall indemnify and hold X-Space360 harmless against claims, losses, penalties, damages, complaints, legal proceedings, guest disputes, regulatory actions, or third-party claims arising from property ownership, inaccurate information, unsafe premises, non-compliance, unauthorized listing, fraud, negligence, or breach of this Agreement by the Host.

### 9. Termination and Suspension
X-Space360 may suspend, restrict, delist, or terminate the Host's account, listing, subscription, or access if the Host breaches this Agreement, violates platform policies, submits false documents, causes guest harm, fails verification, or engages in unlawful, abusive, fraudulent, or reputation-damaging conduct.

### 10. Acceptance and Electronic Signature
By entering the Host's legal details and drawing/signing electronically, the Host confirms that they have read, understood, accepted, and agreed to be bound by this Agreement and all applicable X-Space360 platform policies. The electronic signature shall be treated as valid consent and acceptance for platform verification and onboarding purposes."""

LEGAL_TERMS_TEXT = """## X-SPACE360 PLATFORM TERMS AND CONDITIONS

These Terms and Conditions ("Terms") govern access to and use of the X-Space360 short-term rental platform operated by Golden Rich Financial & Real Estate Solutions Private Limited ("Company", "Platform", "we", "us", or "our"). By registering, browsing, listing, booking, paying, communicating, or otherwise using the Platform, every guest, host, broker, employee, vendor, or authorized user ("User", "you", or "your") confirms that they have read, understood, and agreed to these Terms.

### 1. Platform Scope
X-Space360 provides a technology-enabled marketplace for discovery, listing, verification, booking facilitation, payment coordination, guest communication, support, and related operational services for short-term rental spaces, event venues, commercial spaces, residential properties, and other approved listings. The Platform does not transfer ownership, tenancy, leasehold rights, possession, or any interest in listed properties.

### 2. Account Registration and User Obligations
Users must provide true, complete, current, and verifiable information during registration and while using the Platform. Users are responsible for maintaining confidentiality of login credentials, OTPs, account access, payment instruments, uploaded documents, and all activity performed through their account. The Platform may suspend, restrict, or terminate access where information is false, incomplete, misleading, unauthorized, fraudulent, or harmful to Platform operations.

### 3. Host Listing Responsibilities
Hosts confirm that they are the lawful owner, lessee, manager, or authorized representative of each listed property. Hosts are responsible for accuracy of property details, pricing, availability, amenities, photographs, tax details, cancellation rules, society permissions, statutory approvals, safety standards, local-law compliance, guest readiness, and honoring confirmed bookings.

### 4. Guest Booking Responsibilities
Guests agree to use properties lawfully, respectfully, and only for the approved booking purpose. Guests must provide valid identity details when requested, comply with check-in instructions, occupancy limits, house rules, payment terms, local regulations, and Platform policies. Damage, nuisance, illegal activity, unauthorized events, misrepresentation, or breach of booking rules may result in charges, cancellation, account restriction, or legal action.

### 5. Payments, Fees, Taxes, and Payouts
The Platform may collect or facilitate booking amounts, subscription fees, platform fees, commissions, convenience fees, taxes, security amounts, penalties, refunds, payout adjustments, and other lawful charges. Hosts authorize deduction of applicable amounts before payout. Users are responsible for any taxes, filings, invoices, and compliance obligations applicable to their transaction, role, location, or business activity.

### 6. Cancellations, Refunds, and Disputes
Cancellations, refunds, rescheduling, no-shows, early check-outs, guest complaints, host breaches, service failures, and payout holds are governed by Platform policies shown during booking, listing, or support review. The Platform may verify evidence, documents, chat history, payment records, photographs, audit notes, and third-party information before approving refunds, deductions, penalties, or dispute resolutions.

### 7. Verification, Documents, and Consent
Users authorize X-Space360 to collect, store, review, and verify identity, ownership, address, tax, banking, property, signature, audit, and transaction documents through internal teams, employees, brokers, vendors, payment partners, or lawful third-party sources. Submission of forged, altered, unauthorized, or misleading documents may lead to rejection, delisting, payment hold, account termination, and legal action.

### 8. Prohibited Conduct
Users shall not misuse the Platform, bypass Platform payments, solicit off-platform bookings, upload unlawful content, infringe intellectual property, harass users or staff, manipulate reviews, create duplicate or fake accounts, conceal material facts, perform unauthorized access, interfere with Platform security, or use any listing or booking for unlawful, unsafe, immoral, nuisance-causing, or reputation-damaging activity.

### 9. Content, Communications, and Intellectual Property
Users grant the Platform a non-exclusive right to use submitted listing content, images, descriptions, reviews, communications, verification records, and operational data for Platform services, marketing, compliance, support, analytics, and trust-and-safety purposes. Platform branding, software, workflows, designs, data structures, logos, and content remain protected intellectual property of the Company or its licensors.

### 10. Limitation of Liability and Indemnity
To the maximum extent permitted by law, X-Space360 shall not be liable for indirect, incidental, special, punitive, or consequential losses, including loss of profit, reputation, opportunity, data, business interruption, property issues, third-party conduct, force majeure, local-law action, payment gateway failure, or user breach. Users agree to indemnify and hold the Platform harmless from claims, penalties, losses, damages, disputes, or proceedings arising from their account, listing, booking, documents, conduct, non-compliance, negligence, fraud, or breach of these Terms.

### 11. Suspension, Termination, and Policy Updates
The Platform may update policies, fees, verification standards, operational rules, and these Terms from time to time. Continued use after publication or notification constitutes acceptance. The Platform may suspend, restrict, delist, withhold payouts, cancel bookings, or terminate accounts where required for compliance, safety, fraud prevention, dispute resolution, or protection of users and Platform interests.

### 12. Governing Law and Jurisdiction
These Terms are governed by the laws of India. Subject to applicable law, courts and competent authorities having jurisdiction over the Company's registered or operating location shall have jurisdiction over disputes arising from Platform use, bookings, payments, listings, verification, or these Terms."""

PRIVACY_POLICY_TEXT = """## PRIVACY POLICY

X-Space360 collects and processes information necessary to operate a secure short-term rental platform, including account details, contact information, identity documents, property details, booking records, payment references, support messages, verification information, device metadata, and operational logs. We use this information for registration, authentication, listing review, booking facilitation, payment coordination, fraud prevention, customer support, legal compliance, analytics, and service improvement.

We may share relevant information with payment partners, verification providers, support teams, employees, brokers, service vendors, legal advisors, auditors, government authorities, and other parties where required to deliver Platform services, comply with law, investigate disputes, prevent fraud, or protect rights and safety.

Users must ensure that submitted personal, property, tax, banking, and verification information is accurate and authorized. The Platform applies reasonable technical and organizational safeguards, but no digital system can be guaranteed completely secure. Users may contact support for reasonable account, correction, or privacy requests subject to legal, operational, and record-retention requirements."""

REFUND_CANCELLATION_TEXT = """## CANCELLATION AND REFUND POLICY

Bookings, cancellations, refunds, payout deductions, penalties, and rescheduling requests are handled according to the policy displayed during booking, the host's approved listing rules, payment gateway status, and Platform review. Refunds may be reduced by applicable platform fees, taxes, payment gateway charges, cancellation penalties, damage claims, service usage, or other lawful deductions.

The Platform may hold, adjust, or deny refunds where a user breaches booking rules, provides false information, fails verification, causes damage, misuses the property, cancels outside the permitted window, or raises a claim without sufficient evidence. Host payouts may be adjusted or withheld for verified guest issues, non-delivery of services, listing misrepresentation, cancellation by host, or policy violations."""

async def get_db():
    from server import db_instance
    return db_instance

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user is admin."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Helper to seed landing page CMS content if it doesn't exist
async def _ensure_seeded_landing_content(db: AsyncIOMotorDatabase):
    cursor = db.cms_content.find({"page": "landing"})
    content = await cursor.to_list(length=100)
    if not content:
        now = datetime.now(timezone.utc)
        default_content = [
            {
                "content_id": "cms_hero_default",
                "page": "landing",
                "section": "hero",
                "content_type": "text",
                "content_data": {
                    "sub_tag": "Short-Term Rentals · India",
                    "title": "Elevated <br /> <span class=\"text-terracotta italic font-serif\">Living</span> & <span class=\"text-sage font-serif italic\">Working</span> Spaces.",
                    "subtitle": "Curated residential, commercial, and event venues designed for those who value aesthetics and seamless experiences.",
                    "image_url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
                    "rating": "4.9/5 Average",
                    "trusted_text": "Trusted by 10k+ guests across Maharashtra & Bangalore."
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_how_it_works_default",
                "page": "landing",
                "section": "how_it_works",
                "content_type": "list",
                "content_data": {
                    "steps": [
                        {
                            "id": 1,
                            "icon_name": "User",
                            "shortTitle": "Registration",
                            "heading": "Host Registration & ID Verification",
                            "subtitle": "Establish absolute safety and trust",
                            "paragraph": "Every host profile is verified through secured credentials to maintain guest safety. The verification process is completely automated and takes less than 5 minutes.",
                            "bullets": [
                                "Government KYC & Aadhaar ID verification support.",
                                "Real-time SMS & WhatsApp onboarding confirmations.",
                                "Seamless account switching between Guest and Host mode in one click."
                            ]
                        },
                        {
                            "id": 2,
                            "icon_name": "CreditCard",
                            "shortTitle": "Subscription",
                            "heading": "Flexible Subscription Tiers",
                            "subtitle": "Designed to scale with your renting portfolio",
                            "paragraph": "Select a subscription plan that fits your business model. Each plan starts with an extensive 3-Month Free Trial. Host registration fee is ₹500 (fully refundable during trial evaluation).",
                            "bullets": [
                                "Standard Plan: Perfect for single property hosts (basic statistics and ticketer support).",
                                "Growth Plan: Best for multiple properties (adds priorities and WhatsApp notifications).",
                                "Elite Plan: Dedicated Relationship Manager (RM), featured ranking, and custom contracts."
                            ]
                        },
                        {
                            "id": 3,
                            "icon_name": "Building2",
                            "shortTitle": "Listing Builder",
                            "heading": "Dynamic Property Creator",
                            "subtitle": "Showcase every rich highlight of your space",
                            "paragraph": "Input comprehensive amenities, check-in instructions, custom rules, daily or hourly renting cycles, and upload high-resolution images of your listing.",
                            "bullets": [
                                "Raw Image Uploads with instant drag-and-drop thumbnail previews.",
                                "Dynamic Daily / Hourly pricing configurations based on regional demand.",
                                "Precise Leaflet map geo-location parameter pinning."
                            ]
                        },
                        {
                            "id": 4,
                            "icon_name": "MapPin",
                            "shortTitle": "Audit Visit",
                            "heading": "On-Site Verification Audit",
                            "subtitle": "Mandatory geographical and quality mapping",
                            "paragraph": "To maintain absolute physical validation and trust in the STR market, a Relationship Manager (RM) physically visits the site to audit exact coordinates and quality checks.",
                            "bullets": [
                                "Real-time GPS coordinate logging and leaf mapping to prevent ghost listings.",
                                "Official physical standards audit checklist validation.",
                                "Secure green trust badge activation on successful audit."
                            ]
                        },
                        {
                            "id": 5,
                            "icon_name": "Sparkles",
                            "shortTitle": "Live Earnings",
                            "heading": "Live Operations & Secured Payouts",
                            "subtitle": "Accept guest stays and withdraw seamlessly",
                            "paragraph": "Your property enters our verified discover index instantly. Take advantage of dynamic checkouts with Razorpay secure signature double locks.",
                            "bullets": [
                                "Secure UPI / Card checkouts with instant calendar blocking.",
                                "10-minute calendar lock protects against concurrent bookings.",
                                "Automated bank payouts with professional tax-compliant invoice logs."
                            ]
                        }
                    ]
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_testimonials_default",
                "page": "landing",
                "section": "testimonials",
                "content_type": "list",
                "content_data": {
                    "items": []
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_blog_default",
                "page": "landing",
                "section": "blog",
                "content_type": "list",
                "content_data": {
                    "page_eyebrow": "X-SPACE360 JOURNAL",
                    "page_title": "The Journal",
                    "page_subtitle": "Curated insights, local travel guides, and operational updates for short-term renting and event planning.",
                    "page_hero_image_url": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1600",
                    "posts": [
                        {
                            "id": "p1",
                            "title": "The Future of Short-Term Rentals in India",
                            "excerpt": "How shifting preferences and hybrid work models are driving growth in STR spaces.",
                            "content": "## The Future of Short-Term Rentals in India\n\nHow shifting preferences and hybrid work models are driving growth in STR spaces.",
                            "date": "June 10, 2026",
                            "author": "Amit Sharma",
                            "image_url": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800",
                            "read_time": "6 min read",
                            "is_active": True
                        },
                        {
                            "id": "p2",
                            "title": "Design Tips to Maximize Your Property Yield",
                            "excerpt": "Curate your space to appeal to high-end travelers with styling and amenity upgrades.",
                            "content": "## Design Tips to Maximize Your Property Yield\n\nCurate your space to appeal to high-end travelers with styling and amenity upgrades.",
                            "date": "June 05, 2026",
                            "author": "Neha Patel",
                            "image_url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800",
                            "read_time": "5 min read",
                            "is_active": True
                        },
                        {
                            "id": "p3",
                            "title": "Top 5 Weekend Escapes Near Mumbai & Nashik",
                            "excerpt": "Explore the most beautiful villa retreats and holiday home collections for your next vacation.",
                            "content": "## Top 5 Weekend Escapes Near Mumbai & Nashik\n\nExplore the most beautiful villa retreats and holiday home collections for your next vacation.",
                            "date": "May 28, 2026",
                            "author": "Vikram Singh",
                            "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800",
                            "read_time": "7 min read",
                            "is_active": True
                        }
                    ]
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_footer_default",
                "page": "landing",
                "section": "footer",
                "content_type": "object",
                "content_data": {
                    "brand_description": "Redefining short-term rentals in India through curation, technology, and superior service.",
                    "location": "Nashik, Maharashtra",
                    "email": "support@x-space360.com",
                    "phone": "+91 8484826247",
                    "facebook_link": "https://facebook.com",
                    "instagram_link": "https://instagram.com",
                    "youtube_link": "https://youtube.com",
                    "footer_sections": [
                        {"heading": "For Guests", "items": [
                            {"label": "Browse Space", "action_type": "link", "link": "/guest/browse", "text": ""},
                            {"label": "All Destinations", "action_type": "link", "link": "/guest/browse", "text": ""},
                            {"label": "Short-term Stays", "action_type": "link", "link": "/guest/browse", "text": ""}
                        ]},
                        {"heading": "For Hosts", "items": [
                            {"label": "List Your Space", "action_type": "link", "link": "/host/list-property", "text": ""},
                            {"label": "Become a Host", "action_type": "link", "link": "/register", "text": ""}
                        ]},
                        {"heading": "Company", "items": [
                            {"label": "About Us", "action_type": "link", "link": "/about-us", "text": ""},
                            {"label": "Blog", "action_type": "link", "link": "/blog", "text": ""}
                        ]},
                        {"heading": "Support", "items": [
                            {"label": "Help Center", "action_type": "link", "link": "/support", "text": ""},
                            {"label": "Check-In Instructions", "action_type": "text", "link": "", "text": "Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival."},
                            {"label": "Safety & Privacy", "action_type": "text", "link": "", "text": "X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations."},
                            {"label": "Contact Us", "action_type": "link", "link": "/support", "text": ""}
                        ]}
                    ],
                    "privacy_label": "Privacy Policy",
                    "privacy_text": "X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.",
                    "terms_label": "Terms & Conditions",
                    "terms_text": "By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.",
                    "checkin_label": "Check-in Instructions",
                    "checkin_text": "Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM."
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_offer_default",
                "page": "landing",
                "section": "offer",
                "content_type": "object",
                "content_data": {
                    "is_enabled": True,
                    "title": "Save 10% on a summertime trip",
                    "description": "Book within 7 days and save up to $100 on your next stay. Terms apply.",
                    "button_text": "Log in to claim offer",
                    "image_url": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600"
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_agreement_default",
                "page": "landing",
                "section": "agreement",
                "content_type": "object",
                "content_data": {
                    "title": "SHORT-TERM RENTAL HOST AGREEMENT",
                    "agreement_text": HOST_AGREEMENT_TEXT
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            },
            {
                "content_id": "cms_legal_terms_default",
                "page": "landing",
                "section": "legal_terms",
                "content_type": "object",
                "content_data": {
                    "title": "Legal Terms & Platform Policies",
                    "version": "2026.1",
                    "effective_date": "2026-07-03",
                    "terms_label": "Terms & Conditions",
                    "terms_text": LEGAL_TERMS_TEXT,
                    "privacy_label": "Privacy Policy",
                    "privacy_text": PRIVACY_POLICY_TEXT,
                    "refund_label": "Cancellation & Refund Policy",
                    "refund_text": REFUND_CANCELLATION_TEXT
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
        ]
        for item in default_content:
            await db.cms_content.insert_one(item)
    else:
        footer_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "footer"}, {"_id": 0}
        )
        if not footer_doc:
            now = datetime.now(timezone.utc)
            await db.cms_content.insert_one({
                "content_id": "cms_footer_default",
                "page": "landing",
                "section": "footer",
                "content_type": "object",
                "content_data": {
                    "brand_description": "Redefining short-term rentals in India through curation, technology, and superior service.",
                    "location": "Nashik, Maharashtra",
                    "email": "support@x-space360.com",
                    "phone": "+91 8484826247",
                    "facebook_link": "https://facebook.com",
                    "instagram_link": "https://instagram.com",
                    "youtube_link": "https://youtube.com",
                    "footer_sections": [
                        {"heading": "For Guests", "items": [
                            {"label": "Browse Space", "action_type": "link", "link": "/guest/browse", "text": ""},
                            {"label": "All Destinations", "action_type": "link", "link": "/guest/browse", "text": ""},
                            {"label": "Short-term Stays", "action_type": "link", "link": "/guest/browse", "text": ""}
                        ]},
                        {"heading": "For Hosts", "items": [
                            {"label": "List Your Space", "action_type": "link", "link": "/host/list-property", "text": ""},
                            {"label": "Become a Host", "action_type": "link", "link": "/register", "text": ""}
                        ]},
                        {"heading": "Company", "items": [
                            {"label": "About Us", "action_type": "link", "link": "/about-us", "text": ""},
                            {"label": "Blog", "action_type": "link", "link": "/blog", "text": ""}
                        ]},
                        {"heading": "Support", "items": [
                            {"label": "Help Center", "action_type": "link", "link": "/support", "text": ""},
                            {"label": "Check-In Instructions", "action_type": "text", "link": "", "text": "Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival."},
                            {"label": "Safety & Privacy", "action_type": "text", "link": "", "text": "X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations."},
                            {"label": "Contact Us", "action_type": "link", "link": "/support", "text": ""}
                        ]}
                    ],
                    "privacy_label": "Privacy Policy",
                    "privacy_text": "X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.",
                    "terms_label": "Terms & Conditions",
                    "terms_text": "By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.",
                    "checkin_label": "Check-in Instructions",
                    "checkin_text": "Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM."
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })
        
        offer_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "offer"}, {"_id": 0}
        )
        if not offer_doc:
            now = datetime.now(timezone.utc)
            await db.cms_content.insert_one({
                "content_id": "cms_offer_default",
                "page": "landing",
                "section": "offer",
                "content_type": "object",
                "content_data": {
                    "is_enabled": True,
                    "title": "Save 10% on a summertime trip",
                    "description": "Book within 7 days and save up to $100 on your next stay. Terms apply.",
                    "button_text": "Log in to claim offer",
                    "image_url": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600"
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })

        agreement_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "agreement"}, {"_id": 0}
        )
        if not agreement_doc:
            now = datetime.now(timezone.utc)
            await db.cms_content.insert_one({
                "content_id": "cms_agreement_default",
                "page": "landing",
                "section": "agreement",
                "content_type": "object",
                "content_data": {
                    "title": "SHORT-TERM RENTAL HOST AGREEMENT",
                    "agreement_text": HOST_AGREEMENT_TEXT
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })

        legal_terms_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "legal_terms"}, {"_id": 0}
        )
        if not legal_terms_doc:
            now = datetime.now(timezone.utc)
            await db.cms_content.insert_one({
                "content_id": "cms_legal_terms_default",
                "page": "landing",
                "section": "legal_terms",
                "content_type": "object",
                "content_data": {
                    "title": "Legal Terms & Platform Policies",
                    "version": "2026.1",
                    "effective_date": "2026-07-03",
                    "terms_label": "Terms & Conditions",
                    "terms_text": LEGAL_TERMS_TEXT,
                    "privacy_label": "Privacy Policy",
                    "privacy_text": PRIVACY_POLICY_TEXT,
                    "refund_label": "Cancellation & Refund Policy",
                    "refund_text": REFUND_CANCELLATION_TEXT
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            })
    return content

async def _ensure_seeded_support_content(db: AsyncIOMotorDatabase):
    cursor = db.cms_content.find({"page": "support"})
    content = await cursor.to_list(length=100)
    if not content:
        now = datetime.now(timezone.utc)
        default_content = [
            {
                "content_id": "cms_support_content_default",
                "page": "support",
                "section": "support_content",
                "content_type": "object",
                "content_data": {
                    "title": "How can we help you?",
                    "subtitle": "We're here to help and answer any question you might have.",
                    "search_placeholder": "Search for help articles...",
                    "assist_heading": "How can we assist you today?",
                    "cards": [
                        {
                            "id": "help_center",
                            "title": "Browse Help Center",
                            "description": "Find answers to common questions and guides.",
                            "button_text": "Explore Articles",
                            "action_value": "/faq"
                        },
                        {
                            "id": "live_chat",
                            "title": "Live Chat",
                            "description": "Chat with our support team in real time.",
                            "button_text": "Start Chat",
                            "action_value": "#"
                        },
                        {
                            "id": "email_support",
                            "title": "Email Support",
                            "description": "Send us an email and we'll get back to you.",
                            "button_text": "Send Email",
                            "action_value": "support@x-space360.com"
                        },
                        {
                            "id": "call_support",
                            "title": "Call Support",
                            "description": "Speak directly with our support team.",
                            "button_text": "+91 98765 43210",
                            "action_value": "+91 98765 43210"
                        }
                    ],
                    "popular_topics": [
                        {"label": "How to add a new property?", "link": "/faq#add-property"},
                        {"label": "How to manage leads?", "link": "/faq#manage-leads"},
                        {"label": "How to update documents?", "link": "/faq#update-docs"},
                        {"label": "Subscription & Billing", "link": "/faq#billing"},
                        {"label": "Account & Profile Settings", "link": "/faq#profile"}
                    ],
                    "support_hours": [
                        {"days": "Monday - Saturday", "hours": "9:00 AM - 7:00 PM"},
                        {"days": "Sunday", "hours": "10:00 AM - 4:00 PM"}
                    ],
                    "response_time": "We usually respond within 24 hours.",
                    "footer_title": "Still need help?",
                    "footer_subtitle": "Our support team is ready to assist you.",
                    "footer_button_text": "Start Live Chat"
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
        ]
        for item in default_content:
            await db.cms_content.insert_one(item)
    return content

# ========== PUBLIC CMS ENDPOINTS ==========

@router.get("/landing-page")
async def get_landing_page_content(
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all active landing page content (public)."""
    try:
        await _ensure_seeded_landing_content(db)
        
        cursor = db.cms_content.find(
            {"page": "landing", "is_active": True},
            {"_id": 0}
        )
        content = await cursor.to_list(length=100)
        
        # Organize by section
        organized_content = {}
        for item in content:
            section = item["section"]
            organized_content[section] = item["content_data"]
        
        # Admin cover changes should be visible immediately on the landing page.
        response.headers["Cache-Control"] = "no-store"
        
        # Organize SEO metadata
        organized_content["seo"] = {
            "title": "X-Space360 | Premium Short-term Rentals & Event Venues in India",
            "description": "Discover and book premium villas, corporate offices, co-working spaces, and stunning event venues across India on X-Space360.",
            "keywords": "short term rentals, luxury villas, event venues, banquet halls, co-working spaces, offices",
            "canonical": "https://x-space360.in/",
            "image": "https://x-space360.in/favicon_rich.jpg",
            "robots": "index,follow"
        }

        return organized_content
    
    except Exception as e:
        logger.error(f"Error fetching landing page content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch landing page content"
        )

@router.get("/support-page")
async def get_support_page_content(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get support page content (public)."""
    try:
        await _ensure_seeded_support_content(db)
        
        cursor = db.cms_content.find(
            {"page": "support", "is_active": True},
            {"_id": 0}
        )
        content = await cursor.to_list(length=100)
        
        # Organize by section
        organized_content = {}
        for item in content:
            section = item["section"]
            organized_content[section] = item["content_data"]
            
        return organized_content
    except Exception as e:
        logger.error(f"Error fetching support page content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch support page content"
        )



class ContactMessage(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: str = Field(..., min_length=10)
    subject: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)

@router.post("/contact")
async def submit_contact_message(
    payload: ContactMessage,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit a support/contact message (public)."""
    try:
        import uuid
        now = datetime.now(timezone.utc)
        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        message_doc = {
            "message_id": message_id,
            "name": payload.name,
            "email": payload.email,
            "phone": payload.phone,
            "subject": payload.subject,
            "message": payload.message,
            "status": "pending",
            "created_at": now,
            "updated_at": now
        }
        await db.contact_messages.insert_one(message_doc)
        return {"success": True, "message": "Your message has been submitted successfully."}
    except Exception as e:
        logger.error(f"Error submitting contact message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit your message. Please try again."
        )

# ========== ADMIN CMS ENDPOINTS ==========

@router.get("/admin/content")
async def get_all_cms_content(
    page: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all CMS content (admin)."""
    try:
        if page == "landing":
            await _ensure_seeded_landing_content(db)
        elif page == "support":
            await _ensure_seeded_support_content(db)
            
        query = {}
        if page:
            query["page"] = page
        
        cursor = db.cms_content.find(query, {"_id": 0})
        content = await cursor.to_list(length=200)
        
        return {
            "content": content,
            "total": len(content)
        }
    
    except Exception as e:
        logger.error(f"Error fetching CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch CMS content"
        )

@router.post("/admin/content")
async def create_cms_content(
    page: str,
    section: str,
    content_type: str,
    content_data: dict,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new CMS content."""
    try:
        content_id = f"cms_{int(datetime.now(timezone.utc).timestamp())}"
        
        cms_content = {
            "content_id": content_id,
            "page": page,
            "section": section,
            "content_type": content_type,
            "content_data": content_data,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.cms_content.insert_one(cms_content)
        
        logger.info(f"CMS content created: {content_id}")
        return {"message": "CMS content created successfully", "content_id": content_id}
    
    except Exception as e:
        logger.error(f"Error creating CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create CMS content"
        )

@router.patch("/admin/content/{content_id}")
async def update_cms_content(
    content_id: str,
    update_data: CMSUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update CMS content."""
    try:
        update_fields = {"updated_at": datetime.now(timezone.utc)}
        
        if update_data.content_data:
            update_fields["content_data"] = update_data.content_data
        
        if update_data.is_active is not None:
            update_fields["is_active"] = update_data.is_active
        
        result = await db.cms_content.update_one(
            {"content_id": content_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CMS content not found"
            )
        
        logger.info(f"CMS content updated: {content_id}")
        return {"message": "CMS content updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update CMS content"
        )

@router.delete("/admin/content/{content_id}")
async def delete_cms_content(
    content_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete CMS content."""
    try:
        result = await db.cms_content.delete_one({"content_id": content_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CMS content not found"
            )
        
        logger.info(f"CMS content deleted: {content_id}")
        return {"message": "CMS content deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting CMS content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete CMS content"
        )

# ========== FEATURED PROPERTIES MANAGEMENT ==========

@router.get("/admin/featured-properties")
async def get_featured_properties(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get featured properties list."""
    try:
        cms_doc = await db.cms_content.find_one(
            {"page": "landing", "section": "featured_properties"},
            {"_id": 0}
        )
        
        if not cms_doc:
            return {"property_ids": []}
        
        return cms_doc.get("content_data", {"property_ids": []})
    
    except Exception as e:
        logger.error(f"Error fetching featured properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch featured properties"
        )

@router.post("/admin/featured-properties")
async def set_featured_properties(
    property_ids: List[str],
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Set featured properties for landing page."""
    try:
        # Check if exists
        existing = await db.cms_content.find_one(
            {"page": "landing", "section": "featured_properties"}
        )
        
        if existing:
            # Update
            await db.cms_content.update_one(
                {"page": "landing", "section": "featured_properties"},
                {"$set": {
                    "content_data": {"property_ids": property_ids},
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        else:
            # Create
            await db.cms_content.insert_one({
                "content_id": f"cms_{int(datetime.now(timezone.utc).timestamp())}",
                "page": "landing",
                "section": "featured_properties",
                "content_type": "list",
                "content_data": {"property_ids": property_ids},
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
        
        logger.info(f"Featured properties updated: {len(property_ids)} properties")
        return {"message": "Featured properties updated successfully"}
    
    except Exception as e:
        logger.error(f"Error setting featured properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set featured properties"
        )


# ========== ADMIN SUPPORT / CONTACT MESSAGES ENDPOINTS ==========

class ContactMessageStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|in-progress|resolved)$")
    admin_notes: Optional[str] = None

@router.get("/admin/contact-messages")
async def get_all_contact_messages(
    status: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all contact messages (admin)."""
    try:
        query = {}
        if status:
            query["status"] = status
            
        cursor = db.contact_messages.find(query).sort("created_at", -1)
        messages = await cursor.to_list(length=1000)
        
        for msg in messages:
            # Safely generate and assign message_id if missing (e.g. legacy data)
            if "message_id" not in msg:
                import uuid
                msg["message_id"] = f"msg_{uuid.uuid4().hex[:12]}"
                # Proactively update the document to have the generated message_id
                await db.contact_messages.update_one(
                    {"email": msg.get("email"), "created_at": msg.get("created_at")},
                    {"$set": {"message_id": msg["message_id"]}}
                )
            
            # Map message_id as _id for frontend compatibility
            msg["_id"] = msg["message_id"]
            
        return {
            "messages": messages,
            "total": len(messages)
        }
    except Exception as e:
        logger.error(f"Error fetching contact messages: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch contact messages"
        )

@router.patch("/admin/contact-messages/{message_id}")
async def update_contact_message(
    message_id: str,
    payload: ContactMessageStatusUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update status or notes of a contact message (admin)."""
    try:
        update_fields = {
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc)
        }
        if payload.admin_notes is not None:
            update_fields["admin_notes"] = payload.admin_notes
            
        result = await db.contact_messages.update_one(
            {"message_id": message_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Contact message not found"
            )
            
        return {"success": True, "message": "Contact message updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contact message: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update contact message"
        )

