import os
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class EmailService:
    """Service for email notifications."""
    
    def __init__(self):
        """Initialize email service."""
        self.from_email = os.getenv("FROM_EMAIL", "noreply@propnest.com")
        self.from_name = "X-Space360 STR"
        
        # For now, we'll mock email sending
        # In production, integrate with SendGrid or AWS SES
        logger.info("Email service initialized (MOCK mode)")
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> Dict:
        """Send email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text email body (optional)
        """
        try:
            # Mock mode - log email
            logger.info(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}")
            logger.debug(f"Email content: {html_content[:100]}...")
            
            # In production, use SendGrid or AWS SES here
            # Example with SendGrid:
            # from sendgrid import SendGridAPIClient
            # from sendgrid.helpers.mail import Mail
            # 
            # message = Mail(
            #     from_email=(self.from_email, self.from_name),
            #     to_emails=to_email,
            #     subject=subject,
            #     html_content=html_content
            # )
            # 
            # sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
            # response = sg.send(message)
            
            return {
                "success": True,
                "message_id": f"mock_email_{int(datetime.now(timezone.utc).timestamp())}",
                "mock_mode": True
            }
        
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_subscription_invoice(self, to_email: str, subscription_data: Dict) -> Dict:
        """Send subscription invoice email."""
        subject = f"Subscription Invoice - {subscription_data.get('plan_name', 'Goldenrich STR Subscription')}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Arial', sans-serif; background-color: #FDFCF8; color: #333333; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border: 1px solid #E5E5E0; }}
                .header {{ background-color: #C05C4F; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ padding: 20px; }}
                .invoice-details {{ background: #F5F5F0; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .invoice-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
                .invoice-table th, .invoice-table td {{ padding: 10px; text-align: left; border-bottom: 1px solid #E5E5E0; }}
                .invoice-table th {{ background-color: #E5E5E0; font-weight: bold; }}
                .footer {{ text-align: center; color: #8C8C8C; font-size: 12px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Subscription Invoice 🧾</h1>
                </div>
                <div class="content">
                    <p>Dear Host,</p>
                    <p>Thank you for subscribing to Goldenrich STR. Your payment has been received successfully.</p>
                    
                    <div class="invoice-details">
                        <h3>Invoice Summary</h3>
                        <p><strong>Subscription ID:</strong> {subscription_data.get('subscription_id', 'N/A')}</p>
                        <p><strong>Property ID:</strong> {subscription_data.get('property_id', 'N/A')}</p>
                        <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d')}</p>
                    </div>

                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Billing Cycle</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{subscription_data.get('plan_name', 'N/A')} Plan</td>
                                <td>{subscription_data.get('billing_cycle', 'monthly')}</td>
                                <td>₹{subscription_data.get('amount', 0)}</td>
                            </tr>
                            <tr>
                                <td colspan="2" style="text-align: right; font-weight: bold;">Total Paid</td>
                                <td style="font-weight: bold;">₹{subscription_data.get('amount', 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <p>Your property listing is now under review and will go live shortly.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 Goldenrich STR. All rights reserved.</p>
                    <p>Questions? Contact us at support@goldenrichstr.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

    def send_booking_confirmation(self, to_email: str, booking_data: Dict) -> Dict:
        """Send booking confirmation email."""
        subject = f"Booking Confirmed - {booking_data.get('property_title', 'X-Space360 Property')}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Arial', sans-serif; background-color: #FDFCF8; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }}
                .header {{ background-color: #C05C4F; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ padding: 20px; }}
                .booking-details {{ background: #F5F5F0; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #8C8C8C; font-size: 12px; margin-top: 30px; }}
                .button {{ background: #C05C4F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Booking Confirmed! 🎉</h1>
                </div>
                <div class="content">
                    <p>Dear Guest,</p>
                    <p>Your booking has been confirmed. Get ready for an amazing stay!</p>
                    
                    <div class="booking-details">
                        <h3>Booking Details</h3>
                        <p><strong>Booking ID:</strong> {booking_data.get('booking_id', 'N/A')}</p>
                        <p><strong>Property:</strong> {booking_data.get('property_title', 'N/A')}</p>
                        <p><strong>Check-in:</strong> {booking_data.get('check_in_date', 'N/A')}</p>
                        <p><strong>Check-out:</strong> {booking_data.get('check_out_date', 'N/A')}</p>
                        <p><strong>Total Amount:</strong> ₹{booking_data.get('total_amount', 0)}</p>
                    </div>
                    
                    <p>You will receive check-in instructions closer to your arrival date.</p>
                    
                    <a href="https://propnest.com/bookings/{booking_data.get('booking_id')}" class="button">View Booking</a>
                </div>
                <div class="footer">
                    <p>&copy; 2026 X-Space360 STR. All rights reserved.</p>
                    <p>Questions? Contact us at support@propnest.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
    
    def send_property_approved(self, to_email: str, property_data: Dict) -> Dict:
        """Send property approval email."""
        subject = f"Property Approved - {property_data.get('title', 'Your Property')}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Arial', sans-serif; background-color: #FDFCF8; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }}
                .header {{ background-color: #788574; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ padding: 20px; }}
                .success-badge {{ background: #10B981; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }}
                .footer {{ text-align: center; color: #8C8C8C; font-size: 12px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Congratulations! ✅</h1>
                </div>
                <div class="content">
                    <p>Dear Host,</p>
                    <div class="success-badge">Your Property is Now LIVE!</div>
                    <p><strong>{property_data.get('title', 'Your property')}</strong> has been approved and is now visible to guests on X-Space360.</p>
                    <p>Start receiving bookings and maximize your rental income!</p>
                    <p>Property ID: {property_data.get('property_id', 'N/A')}</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 X-Space360 STR. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
    
    def send_subscription_reminder(self, to_email: str, days_remaining: int, subscription_data: Dict) -> Dict:
        """Send subscription expiry reminder."""
        subject = f"Subscription Expiring in {days_remaining} Days - Action Required"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Arial', sans-serif; background-color: #FDFCF8; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }}
                .header {{ background-color: #FCD34D; color: #78350F; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ padding: 20px; }}
                .warning {{ background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }}
                .button {{ background: #C05C4F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }}
                .footer {{ text-align: center; color: #8C8C8C; font-size: 12px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Subscription Expiring Soon</h1>
                </div>
                <div class="content">
                    <p>Dear Host,</p>
                    <div class="warning">
                        <strong>Your subscription expires in {days_remaining} days!</strong><br>
                        Plan: {subscription_data.get('plan_name', 'N/A')}<br>
                        Expiry Date: {subscription_data.get('end_date', 'N/A')}
                    </div>
                    <p>Renew now to keep your property visible to guests and continue receiving bookings.</p>
                    <a href="https://propnest.com/subscriptions/renew" class="button">Renew Subscription</a>
                </div>
                <div class="footer">
                    <p>&copy; 2026 X-Space360 STR. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

email_service = EmailService()