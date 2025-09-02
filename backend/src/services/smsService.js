// src/services/smsService.js

/**
 * SMS Service for Bank App
 * 
 * Phase 1: Console logging for testing
 * Phase 2: Will integrate with Twilio for real SMS
 */

// Simple SMS service that logs to console (for testing)
export const sendSMS = async (phoneNumber, message) => {
  try {
    // For now, just log the SMS to console
    console.log('📱 SMS SENT:');
    console.log(`   To: ${phoneNumber}`);
    console.log(`   Message: ${message}`);
    console.log(`   Time: ${new Date().toLocaleString()}`);
    console.log('   Status: ✅ Delivered (simulated)');
    console.log('-----------------------------------');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return success response
    return {
      success: true,
      messageId: `sim_${Date.now()}`, // Simulated message ID
      status: 'delivered'
    };

  } catch (error) {
    console.error('❌ SMS Service Error:', error);
    
    // Return error response
    return {
      success: false,
      error: error.message,
      status: 'failed'
    };
  }
};

/**
 * Future Twilio Integration (commented out for now)
 * Uncomment and configure when ready to use real SMS
 */

/*
import twilio from 'twilio';

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const client = twilio(accountSid, authToken);

export const sendSMSWithTwilio = async (phoneNumber, message) => {
  try {
    // Validate Twilio configuration
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('Twilio configuration missing');
    }

    // Send SMS via Twilio
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber
    });

    console.log(`✅ SMS sent successfully: ${result.sid}`);
    
    return {
      success: true,
      messageId: result.sid,
      status: result.status
    };

  } catch (error) {
    console.error('❌ Twilio SMS Error:', error);
    
    return {
      success: false,
      error: error.message,
      status: 'failed'
    };
  }
};
*/

// Validate phone number format
export const isValidPhoneNumber = (phoneNumber) => {
  // Basic phone number validation
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phoneNumber);
};

// Format phone number for display
export const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as: +1 (555) 123-4567
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Format as: (555) 123-4567
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Return as-is if doesn't match common patterns
  return phoneNumber;
};