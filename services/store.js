import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('data', 'db.json');

const DEFAULT_DATA = {
  contacts: [
    {
      id: 'c_1',
      name: 'Janith Manodaya',
      phone: '94771234567',
      birthday: '1996-08-15',
      department: 'Software Engineering',
      designation: 'Senior Developer'
    },
    {
      id: 'c_2',
      name: 'Nimali Perera',
      phone: '94719876543',
      birthday: '1998-07-28',
      department: 'Marketing',
      designation: 'Executive'
    },
    {
      id: 'c_3',
      name: 'Kamal Jayasinghe',
      phone: '94755554433',
      birthday: '1992-12-05',
      department: 'Human Resources',
      designation: 'HR Manager'
    }
  ],
  wishTemplate: "🎉 Warm Birthday Wishes! Dear <<Name>>, wishing you a very Happy Birthday from all of us at <<Department>>! May your year ahead be filled with success, health, and happiness. 🎂✨",
  settings: {
    apiToken: process.env.TEXTLK_API_TOKEN || '6292|lmaszchAa9olYfpCMzIs4M5HHIW79E1bQbeqBpN7635f7bf4',
    senderId: process.env.TEXTLK_SENDER_ID || 'TextLKDemo',
    authMethod: process.env.TEXTLK_AUTH_METHOD || 'oauth',
    sendTime: '09:00',
    simulationMode: false
  },
  logs: []
};

export class Store {
  constructor() {
    this.ensureDb();
    this.data = this.read();
  }

  ensureDb() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2));
    }
  }

  read() {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading db.json, fallback to defaults', e);
      return { ...DEFAULT_DATA };
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('Error writing db.json', e);
    }
  }

  get() {
    return this.data;
  }

  setContacts(contacts) {
    this.data.contacts = contacts;
    this.save();
  }

  setTemplate(template) {
    this.data.wishTemplate = template;
    this.save();
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  addLog(log) {
    this.data.logs.unshift(log);
    // Keep max 500 logs
    if (this.data.logs.length > 500) {
      this.data.logs = this.data.logs.slice(0, 500);
    }
    this.save();
  }

  clearLogs() {
    this.data.logs = [];
    this.save();
  }
}
