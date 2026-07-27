import cron from 'node-cron';
import { TextLKService } from './textlkService.js';

export class SchedulerService {
  constructor(store) {
    this.store = store;
    this.cronTask = null;
  }

  /**
   * Start the node-cron automated scheduler (runs every 5 minutes to ensure timely checks)
   */
  startCron() {
    if (this.cronTask) {
      this.cronTask.stop();
    }

    console.log('⏰ [Birthday Scheduler] Background cron service initialized...');

    // Run every 5 minutes to check pending dispatches
    this.cronTask = cron.schedule('*/5 * * * *', async () => {
      await this.processTodayBirthdays();
    });

    // Run immediately on boot as well
    this.processTodayBirthdays().catch(err => {
      console.error('Error during initial birthday check:', err);
    });
  }

  /**
   * Replaces field placeholders like <<Name>>, <<Department>>, <<Designation>>, <<Birthday>>, <<Phone Number>> in wish template
   */
  static renderTemplate(templateStr, contact) {
    if (!templateStr) return '';
    let rendered = templateStr;
    const fields = {
      'Name': contact.name || contact.Name || '',
      'name': contact.name || contact.Name || '',
      'Phone Number': contact.phone || contact.phone_number || contact['Phone Number'] || '',
      'phone': contact.phone || contact.phone_number || contact['Phone Number'] || '',
      'Birthday': contact.birthday || contact.Birthday || '',
      'Department': contact.department || contact.Department || 'Our Team',
      'Designation': contact.designation || contact.Designation || 'Valued Team Member'
    };

    // Replace all <<Field>> or {{Field}} or {Field}
    Object.keys(fields).forEach(key => {
      const val = fields[key];
      const regexes = [
        new RegExp(`<<\\s*${key}\\s*>>`, 'gi'),
        new RegExp(`{{\\s*${key}\\s*}}`, 'gi'),
        new RegExp(`{\\s*${key}\\s*}`, 'gi')
      ];
      regexes.forEach(r => {
        rendered = rendered.replace(r, val);
      });
    });

    return rendered;
  }

  /**
   * Scans store for today's birthdays and schedules dispatches if not already scheduled today
   */
  async processTodayBirthdays() {
    const data = this.store.get();
    const { contacts, settings, wishTemplate } = data;

    if (!contacts || contacts.length === 0) return;

    const today = new Date();
    const todayMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayYYYYMMDD = today.toISOString().split('T')[0];

    const sendTimeSetting = settings.sendTime || '09:00'; // e.g. "09:00"
    const [sendHour, sendMinute] = sendTimeSetting.split(':').map(Number);

    for (const contact of contacts) {
      if (!contact.birthday) continue;

      // Extract MM-DD from contact.birthday (e.g., 1995-07-27 or 07-27)
      const bdayParts = contact.birthday.split('-');
      let bdayMonthDay = '';
      if (bdayParts.length === 3) {
        bdayMonthDay = `${bdayParts[1].padStart(2, '0')}-${bdayParts[2].padStart(2, '0')}`;
      } else if (bdayParts.length === 2) {
        bdayMonthDay = `${bdayParts[0].padStart(2, '0')}-${bdayParts[1].padStart(2, '0')}`;
      }

      if (bdayMonthDay === todayMonthDay) {
        // Check if SMS already scheduled or sent for this contact today
        const existingLog = data.logs.find(log => 
          log.contactId === contact.id && log.targetDate === todayYYYYMMDD
        );

        if (!existingLog) {
          // Render SMS message
          const messageText = SchedulerService.renderTemplate(wishTemplate, contact);

          // Construct Text.lk schedule timestamp format (Y-m-d H:i)
          const targetTime = new Date(today);
          targetTime.setHours(sendHour, sendMinute, 0, 0);

          const isPastTimeToday = today > targetTime;
          let scheduleTimeStr = null;

          if (!isPastTimeToday) {
            scheduleTimeStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(sendHour).padStart(2, '0')}:${String(sendMinute).padStart(2, '0')}`;
          }

          console.log(`🎂 Today is ${contact.name}'s birthday! Preparing SMS...`);

          const sendResult = await TextLKService.sendSMS({
            apiToken: settings.apiToken,
            senderId: settings.senderId,
            recipient: contact.phone,
            message: messageText,
            scheduleTime: scheduleTimeStr,
            authMethod: settings.authMethod || 'oauth',
            simulationMode: settings.simulationMode
          });

          // Log entry
          const newLog = {
            id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 5),
            contactId: contact.id,
            contactName: contact.name,
            phone: contact.phone,
            department: contact.department,
            message: messageText,
            targetDate: todayYYYYMMDD,
            scheduledTime: scheduleTimeStr || 'Immediate',
            status: sendResult.status ? (scheduleTimeStr ? 'Scheduled' : 'Sent') : 'Failed',
            response: sendResult,
            createdAt: new Date().toISOString()
          };

          this.store.addLog(newLog);
        }
      }
    }
  }

  /**
   * Manually trigger/schedule dispatches for all uploaded contacts on their respective upcoming birthdays
   */
  async scheduleAllContacts() {
    const data = this.store.get();
    const { contacts, settings, wishTemplate } = data;

    if (!contacts || contacts.length === 0) {
      return { count: 0, message: 'No contacts found to schedule.' };
    }

    const currentYear = new Date().getFullYear();
    const sendTimeSetting = settings.sendTime || '09:00';
    let scheduledCount = 0;

    for (const contact of contacts) {
      if (!contact.birthday || !contact.phone) continue;

      // Extract MM-DD
      const bdayParts = contact.birthday.split('-');
      let month = '';
      let day = '';
      if (bdayParts.length === 3) {
        month = bdayParts[1].padStart(2, '0');
        day = bdayParts[2].padStart(2, '0');
      } else if (bdayParts.length === 2) {
        month = bdayParts[0].padStart(2, '0');
        day = bdayParts[1].padStart(2, '0');
      } else {
        continue;
      }

      // Calculate target date (this year or next year if past)
      const now = new Date();
      let targetDate = new Date(`${currentYear}-${month}-${day}T${sendTimeSetting}:00`);

      if (targetDate < now) {
        // Birthday already passed this year, schedule for next year!
        targetDate = new Date(`${currentYear + 1}-${month}-${day}T${sendTimeSetting}:00`);
      }

      const targetYYYYMMDD = targetDate.toISOString().split('T')[0];
      const scheduleTimeStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')} ${sendTimeSetting}`;

      // Check if already in queue
      const existing = data.logs.find(l => l.contactId === contact.id && l.targetDate === targetYYYYMMDD);
      if (existing) continue;

      const messageText = SchedulerService.renderTemplate(wishTemplate, contact);

      const sendResult = await TextLKService.sendSMS({
        apiToken: settings.apiToken,
        senderId: settings.senderId,
        recipient: contact.phone,
        message: messageText,
        scheduleTime: scheduleTimeStr,
        authMethod: settings.authMethod || 'oauth',
        simulationMode: settings.simulationMode
      });

      const logEntry = {
        id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 5),
        contactId: contact.id,
        contactName: contact.name,
        phone: contact.phone,
        department: contact.department,
        message: messageText,
        targetDate: targetYYYYMMDD,
        scheduledTime: scheduleTimeStr,
        status: sendResult.status ? 'Scheduled' : 'Failed',
        response: sendResult,
        createdAt: new Date().toISOString()
      };

      this.store.addLog(logEntry);
      scheduledCount++;
    }

    return {
      count: scheduledCount,
      message: `Successfully generated and scheduled ${scheduledCount} birthday wishes!`
    };
  }
}
