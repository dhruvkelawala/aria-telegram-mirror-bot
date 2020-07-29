const TelegramBot = require('node-telegram-bot-api');
import { botToken } from '../.constants.js';
import TelegramBot from 'node-telegram-bot-api';

export const bot = new TelegramBot(botToken, { polling: true });

