import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { Store } from './services/store.js';
import { TextLKService } from './services/textlkService.js';
import { SchedulerService } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const store = new Store();
const scheduler = new SchedulerService(store);

// Initialize background cron scheduler
scheduler.startCron();

/**
 * 1. Download Standard Excel Template
 * Generates an .xlsx file with proper headers and sample records
 */
app.get('/api/template/download', (req, res) => {
  try {
    const sampleData = [
      {
        'Name': 'Kasun Rajitha',
        'Phone Number': '0771234567',
        'Birthday': '1995-08-15',
        'Department': 'Information Technology',
        'Designation': 'Software Engineer'
      },
      {
        'Name': 'Dilini Fernando',
        'Phone Number': '0719876543',
        'Birthday': '1998-11-20',
        'Department': 'Human Resources',
        'Designation': 'HR Executive'
      },
      {
        'Name': 'Sahan Perera',
        'Phone Number': '0751122334',
        'Birthday': '1992-04-10',
        'Department': 'Finance & Accounting',
        'Designation': 'Accountant'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Name
      { wch: 18 }, // Phone Number
      { wch: 15 }, // Birthday
      { wch: 25 }, // Department
      { wch: 25 }  // Designation
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Birthdays');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Birthday_Wishes_Template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate Excel template' });
  }
});

/**
 * 2. Upload & Extract Excel Data
 */
app.post('/api/upload', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No Excel file uploaded' });
  }

  const filePath = req.file.path;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Cleanup uploaded temp file
    fs.unlinkSync(filePath);

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty' });
    }

    const processedContacts = [];
    const errors = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      
      // Case insensitive property lookup helper
      const getProp = (keys) => {
        for (const k of Object.keys(row)) {
          if (keys.some(key => k.trim().toLowerCase() === key.toLowerCase())) {
            return row[k];
          }
        }
        return '';
      };

      const name = String(getProp(['Name', 'Full Name', 'Employee Name', 'First Name']) || '').trim();
      const rawPhone = String(getProp(['Phone Number', 'Phone', 'Mobile', 'Contact', 'Recipient']) || '').trim();
      const rawBday = String(getProp(['Birthday', 'Birth Date', 'DOB', 'Date of Birth']) || '').trim();
      const dept = String(getProp(['Department', 'Dept', 'Division']) || 'General').trim();
      const desig = String(getProp(['Designation', 'Title', 'Position', 'Role']) || 'Staff').trim();

      if (!name) {
        errors.push(`Row ${rowNum}: Name is missing.`);
        return;
      }
      if (!rawPhone) {
        errors.push(`Row ${rowNum} (${name}): Phone number is missing.`);
        return;
      }

      // Format Phone number to Sri Lanka 947XXXXXXXX standard
      const formattedPhone = TextLKService.formatPhoneNumber(rawPhone);
      if (!formattedPhone) {
        errors.push(`Row ${rowNum} (${name}): Invalid phone number "${rawPhone}".`);
        return;
      }

      // Format Birthday to YYYY-MM-DD or MM-DD
      let formattedBday = rawBday;
      if (typeof rawBday === 'number') {
        // Excel date serial number conversion
        const parsedDate = XLSX.SSF.parse_date_code(rawBday);
        if (parsedDate) {
          formattedBday = `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
        }
      } else {
        // Parse date strings (e.g. 1995/08/15, 15-08-1995, 1995-08-15)
        const dateMatch = String(rawBday).match(/(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
        if (dateMatch) {
          formattedBday = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
        }
      }

      processedContacts.push({
        id: 'c_' + Date.now() + '_' + index,
        name,
        phone: formattedPhone,
        originalPhone: rawPhone,
        birthday: formattedBday,
        department: dept,
        designation: desig
      });
    });

    // Save to store
    store.setContacts(processedContacts);

    // Auto trigger scheduling logic
    scheduler.scheduleAllContacts();

    return res.json({
      success: true,
      count: processedContacts.length,
      contacts: processedContacts,
      errors
    });
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Error parsing Excel upload:', error);
    return res.status(500).json({ error: 'Failed to process Excel file. Please ensure it is a valid .xlsx or .xls file.' });
  }
});

/**
 * 3. Get Application State (Contacts, Wish Template, Settings, Logs)
 */
app.get('/api/state', (req, res) => {
  res.json(store.get());
});

/**
 * 4. Update Wish Template & Settings
 */
app.post('/api/settings', (req, res) => {
  const { wishTemplate, settings } = req.body;
  if (wishTemplate !== undefined) {
    store.setTemplate(wishTemplate);
  }
  if (settings) {
    store.updateSettings(settings);
  }

  // Trigger reschedule if sendTime changed
  scheduler.scheduleAllContacts();

  res.json({ success: true, state: store.get() });
});

/**
 * 5. Contacts CRUD
 */
app.get('/api/contacts', (req, res) => {
  res.json(store.get().contacts);
});

app.post('/api/contacts', (req, res) => {
  const { name, phone, birthday, department, designation } = req.body;
  if (!name || !phone || !birthday) {
    return res.status(400).json({ error: 'Name, Phone number, and Birthday are required.' });
  }
  const formattedPhone = TextLKService.formatPhoneNumber(phone);
  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }

  const contacts = store.get().contacts;
  const newContact = {
    id: 'c_' + Date.now(),
    name,
    phone: formattedPhone,
    birthday,
    department: department || 'General',
    designation: designation || 'Staff'
  };

  contacts.push(newContact);
  store.setContacts(contacts);

  res.json({ success: true, contact: newContact });
});

app.put('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, birthday, department, designation } = req.body;
  const contacts = store.get().contacts;
  const index = contacts.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  const formattedPhone = TextLKService.formatPhoneNumber(phone);
  if (!formattedPhone) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }

  contacts[index] = {
    ...contacts[index],
    name: name || contacts[index].name,
    phone: formattedPhone,
    birthday: birthday || contacts[index].birthday,
    department: department || contacts[index].department,
    designation: designation || contacts[index].designation
  };

  store.setContacts(contacts);
  scheduler.scheduleAllContacts();

  res.json({ success: true, contact: contacts[index] });
});

app.delete('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  const contacts = store.get().contacts.filter(c => c.id !== id);
  store.setContacts(contacts);
  res.json({ success: true });
});

/**
 * 6. Send Single Test SMS
 */
app.post('/api/sms/test', async (req, res) => {
  const { recipient, message } = req.body;
  const state = store.get();
  const settings = state.settings;

  const result = await TextLKService.sendSMS({
    apiToken: settings.apiToken,
    senderId: settings.senderId,
    recipient: recipient,
    message: message || 'Test birthday wish from Regnis SMS Scheduler!',
    authMethod: settings.authMethod,
    simulationMode: settings.simulationMode
  });

  res.json(result);
});

/**
 * 6.0 Get Text.lk Balance
 */
app.get('/api/balance', async (req, res) => {
  const state = store.get();
  const settings = state.settings;

  if (settings.simulationMode || !settings.apiToken) {
    return res.json({
      success: true,
      simulated: true,
      balance: '100.00',
      expiredOn: 'N/A (Simulation)'
    });
  }

  try {
    const response = await axios.get('https://app.text.lk/api/v3/balance', {
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.data && response.data.status === 'success') {
      res.json({
        success: true,
        balance: response.data.data.remaining_balance,
        expiredOn: response.data.data.expired_on
      });
    } else {
      res.json({
        success: false,
        error: response.data?.message || 'Failed to fetch balance'
      });
    }
  } catch (error) {
    console.error('Error fetching balance from Text.lk:', error.message);
    res.json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});

/**
 * 6.1 Get Custom Lists
 */
app.get('/api/lists', (req, res) => {
  res.json(store.get().customLists || []);
});

/**
 * 6.2 Create or Update Custom List
 */
app.post('/api/lists', (req, res) => {
  const { id, name, description, contactIds } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'List name is required.' });
  }
  const lists = store.get().customLists || [];
  if (id) {
    const idx = lists.findIndex(l => l.id === id);
    if (idx !== -1) {
      lists[idx] = { id, name, description: description || '', contactIds: contactIds || [] };
    } else {
      return res.status(404).json({ error: 'List not found.' });
    }
  } else {
    const newList = {
      id: 'list_' + Date.now(),
      name,
      description: description || '',
      contactIds: contactIds || []
    };
    lists.push(newList);
  }
  store.setCustomLists(lists);
  res.json({ success: true, lists });
});

/**
 * 6.3 Delete Custom List
 */
app.delete('/api/lists/:id', (req, res) => {
  const { id } = req.params;
  const lists = store.get().customLists || [];
  const filtered = lists.filter(l => l.id !== id);
  store.setCustomLists(filtered);
  res.json({ success: true, lists: filtered });
});

/**
 * 6.4 Send Bulk SMS
 */
app.post('/api/sms/bulk', async (req, res) => {
  const { recipients, message } = req.body;
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients array is required.' });
  }
  if (!message) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const state = store.get();
  const settings = state.settings;
  const results = [];

  for (const contact of recipients) {
    const renderedMessage = SchedulerService.renderTemplate(message, contact);
    const sendResult = await TextLKService.sendSMS({
      apiToken: settings.apiToken,
      senderId: settings.senderId,
      recipient: contact.phone,
      message: renderedMessage,
      authMethod: settings.authMethod,
      simulationMode: settings.simulationMode
    });

    const logEntry = {
      id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 5),
      contactId: contact.id || 'bulk_manual',
      contactName: contact.name,
      phone: contact.phone,
      department: contact.department || 'Bulk Messenger',
      message: renderedMessage,
      targetDate: new Date().toISOString().split('T')[0],
      scheduledTime: 'Immediate (Bulk)',
      status: sendResult.status ? 'Sent' : 'Failed',
      response: sendResult,
      createdAt: new Date().toISOString()
    };
    store.addLog(logEntry);

    results.push({
      contactId: contact.id,
      name: contact.name,
      phone: contact.phone,
      status: sendResult.status ? 'Sent' : 'Failed',
      message: sendResult.message
    });
  }

  res.json({ success: true, results });
});

/**
 * 7. Bulk Schedule All
 */
app.post('/api/schedule/all', async (req, res) => {
  const result = await scheduler.scheduleAllContacts();
  res.json(result);
});

/**
 * 8. Logs
 */
app.get('/api/logs', (req, res) => {
  res.json(store.get().logs);
});

app.post('/api/logs/clear', (req, res) => {
  store.clearLogs();
  res.json({ success: true });
});

// Static web UI serving (Vite dist or fallback public UI)
const publicPath = path.resolve('public');
const distPath = path.resolve('dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Regnis Birthday Wish SMS Server running on http://localhost:${PORT}`);
});

