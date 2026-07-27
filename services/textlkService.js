import axios from 'axios';

/**
 * Service to handle Text.lk Sri Lanka SMS Gateway integration
 */
export class TextLKService {
  /**
   * Send or schedule an SMS via Text.lk API
   * @param {Object} options
   * @param {string} options.apiToken - Text.lk API token
   * @param {string} options.senderId - Registered sender ID (e.g. TextLKDemo)
   * @param {string} options.recipient - Phone number with country code (e.g. 94710000000)
   * @param {string} options.message - Text message content
   * @param {string} [options.scheduleTime] - Optional schedule time in 'Y-m-d H:i' RFC3339 format
   * @param {string} [options.authMethod='oauth'] - 'oauth' (Bearer POST) or 'http' (GET url param)
   * @param {boolean} [options.simulationMode=false] - If true, simulates SMS dispatch without invoking actual Text.lk API
   */
  static async sendSMS({
    apiToken,
    senderId = 'TextLKDemo',
    recipient,
    message,
    scheduleTime,
    authMethod = 'oauth',
    simulationMode = false
  }) {
    if (!recipient || !message) {
      return { status: false, message: 'Recipient and message body are required.' };
    }

    // Clean phone number: remove spaces, dashes, plus sign, convert 07X to 947X
    const cleanedRecipient = this.formatPhoneNumber(recipient);
    if (!cleanedRecipient) {
      return { status: false, message: `Invalid phone number format: ${recipient}` };
    }

    if (simulationMode || !apiToken) {
      console.log('[TextLK Simulation] SMS dispathed/scheduled:', {
        recipient: cleanedRecipient,
        senderId,
        message,
        scheduleTime: scheduleTime || 'Immediate',
        simulatedAt: new Date().toISOString()
      });
      return {
        status: true,
        isSimulated: true,
        message: 'SMS queued successfully (Simulated)',
        data: {
          uid: 'sim_' + Date.now() + Math.random().toString(36).substring(2, 7),
          to: cleanedRecipient,
          from: senderId,
          message,
          status: scheduleTime ? 'Scheduled' : 'Delivered',
          cost: '1',
          sms_count: Math.ceil(message.length / 160)
        }
      };
    }

    try {
      if (authMethod === 'http') {
        // GET Method
        const url = new URL('https://app.text.lk/api/http/sms/send');
        url.searchParams.append('recipient', cleanedRecipient);
        url.searchParams.append('sender_id', senderId);
        url.searchParams.append('type', 'plain');
        url.searchParams.append('message', message);
        url.searchParams.append('api_token', apiToken);
        if (scheduleTime) {
          url.searchParams.append('schedule_time', scheduleTime);
        }

        const response = await axios.get(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        return this.parseResponse(response.data);
      } else {
        // OAuth 2.0 Bearer Token POST Method (Recommended)
        const payload = {
          recipient: cleanedRecipient,
          sender_id: senderId,
          type: 'plain',
          message: message
        };
        if (scheduleTime) {
          payload.schedule_time = scheduleTime;
        }

        const response = await axios.post(
          'https://app.text.lk/api/v3/sms/send',
          payload,
          {
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 15000
          }
        );
        return this.parseResponse(response.data);
      }
    } catch (error) {
      console.error('[TextLK API Error]:', error.response?.data || error.message);
      // Try to extract a meaningful error message from the API response body
      const apiMessage = error.response?.data?.message
        || error.response?.data?.error
        || (typeof error.response?.data === 'string' ? error.response.data : null)
        || error.message
        || 'Failed to connect to Text.lk gateway';
      return {
        status: false,
        message: apiMessage,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Formats a phone number for Sri Lanka SMS API (e.g. 0771234567 -> 94771234567)
   */
  static formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = String(phone).replace(/[\s\-\+\(\)]/g, '').trim();
    if (cleaned.startsWith('0')) {
      cleaned = '94' + cleaned.substring(1);
    } else if (!cleaned.startsWith('94') && cleaned.length === 9) {
      cleaned = '94' + cleaned;
    }
    // Sri Lanka phone regex check: 94 + 9 digits
    if (/^94[0-9]{9}$/.test(cleaned)) {
      return cleaned;
    }
    // Return cleaned if length is valid (allow international numbers too)
    return cleaned.length >= 10 && cleaned.length <= 15 ? cleaned : null;
  }

  static parseResponse(resData) {
    if (!resData) {
      return { status: false, message: 'Empty response from gateway server' };
    }
    if (typeof resData === 'string') {
      try { resData = JSON.parse(resData); } catch (e) {}
    }
    const isSuccess = resData.status === 'success' || resData.status === true;
    return {
      status: isSuccess,
      message: resData.message || (isSuccess ? 'SMS operation successful' : 'API call failed'),
      data: resData.data || resData
    };
  }
}
