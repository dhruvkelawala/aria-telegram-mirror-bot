import TelegramBot = require('node-telegram-bot-api');

const bot = require('./utils/bot');
import search = require('./utils/api');
import { mirror } from './download_tools/downloader';
import redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL,
});

// bot.onText(/\/start/, (msg: TelegramBot.Message) => {
//   const chatId = msg.chat.id;

//   const resp = `Hello fellow Prix User. Thanks for using Prix. Using this bot, you can REQUEST some content using /request or REPORT A BUG using /bug.`;

//   bot.sendMessage(chatId, resp);
// });

// bot.onText(/^\/request (.+)/, (msg: TelegramBot.Message) => {
//   const req = msg.text.split(' ');
//   const chatId = msg.chat.id;

//   let contentType = req[1];

//   let respMessage;

//   if (contentType === '#movie') {
//     respMessage = 'Your Movie has been requested!';
//     forwardRequest('Movie', req.slice(2).join(' '));
//   } else if (contentType === '#show') {
//     respMessage = 'Your Show has been requested!';
//     forwardRequest(
//       'Show',
//       `${req.slice(2, req.indexOf('#season')).join(' ')} S0${req
//         .slice(req.indexOf('#season') + 1)
//         .join(' ')}`
//     );
//   } else {
//     respMessage = `Please follow the proper format. /request #movie MovieName or /request #show ShowName #season SeasonNumber`;
//   }

//   bot.sendMessage(chatId, respMessage);
// });

bot.onText(/^\/request$/, (msg: TelegramBot.Message) => {
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Movie',
            callback_data: 'movie',
          },
          {
            text: 'Show',
            callback_data: 'show',
          },
        ],
      ],
    },
  };
  bot.sendMessage(
    msg.from.id,
    'Which type of content do you want to request?',
    opts
  );
});

bot.on('callback_query', async function onCallbackQuery(
  callbackQuery: TelegramBot.CallbackQuery
) {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  let opts: any = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  };
  let text;
  if (action === 'movie' || action === 'show') {
    if (action === 'movie') {
      text = 'Movie Requested';
      bot.editMessageText(text, opts);

      getContent(msg);
    } else {
      text = 'Show Requested';
      bot.editMessageText(text, opts);

      getSeason(msg);
    }
  } else if (action.includes('allow') || action.includes('reject')) {
    const actionList = action.split(':');
    if (action.includes('allow')) {
      text = 'approved';
      const buttons = await searchQuery(actionList[1], actionList[2]);
      if (buttons.length === 0) {
        bot.sendMessage(opts.chat_id, 'Cannot Find the content', opts);
        bot.sendMessage(
          actionList[3],
          `The content you requested(${actionList[2]}) was accepted but unfortunately, no result was found!`
        );
      } else {
        opts.reply_markup = { inline_keyboard: buttons };
        console.log(opts);
      }
    } else {
      text = 'rejected';
    }
    const modText = `Request of a ${actionList[1]} named ${actionList[2]} has been ${text} by ${callbackQuery.from.first_name}!`;
    const respMsg: any = await bot.editMessageText(modText, opts);
    const senderText = `Your request of ${actionList[2]} has been ${text}`;
    bot.sendMessage(actionList[3], senderText);

    if (text === 'rejected') {
      setTimeout(() => {
        bot.deleteMessage(opts.chat_id, respMsg.message_id);
      }, 10000);
    }
  // } else if (action === 'cancel_mirror') {
  //   cancelMirror(msg);
  } else {
    await getMagnet(action, msg);
  }
});

const getSeason = async (msg: TelegramBot.Message): Promise<void> => {
  const opts = {
    chat_id: msg.chat.id,
    user: msg.from.first_name,
    reply_markup: {
      force_reply: true,
    },
  };
  const text = 'Now send the name of the show you want';
  let reqMsg1 = await bot.sendMessage(opts.chat_id, text, opts);
  bot.onReplyToMessage(
    opts.chat_id,
    reqMsg1.message_id,
    async (showNameMsg: TelegramBot.Message) => {
      const respMsg = await bot.sendMessage(
        opts.chat_id,
        `Send Season Number`,
        opts
      );
      bot.onReplyToMessage(
        opts.chat_id,
        respMsg.message_id,
        (seasonMsg: TelegramBot.Message) => {
          forwardRequest(
            'Show',
            `${showNameMsg.text} S0${seasonMsg.text}`,
            opts
          );
          bot.sendMessage(
            opts.chat_id,
            `Season ${seasonMsg.text} of ${showNameMsg.text} has successfully been requested!`
          );
        }
      );
    }
  );
};

const getContent = async (msg: TelegramBot.Message): Promise<void> => {
  const opts = {
    chat_id: msg.chat.id,
    user: msg.from.first_name,
    reply_markup: {
      force_reply: true,
    },
  };
  const text = 'Now send the name of the movie you want';

  let reqMsg = await bot.sendMessage(opts.chat_id, text, opts);
  bot.onReplyToMessage(
    opts.chat_id,
    reqMsg.message_id,
    (respMsg: TelegramBot.Message) => {
      forwardRequest('Movie', respMsg.text, opts);
      bot.sendMessage(
        opts.chat_id,
        `${respMsg.text} has successfully been requested!`
      );
    }
  );
};

const forwardRequest = (
  content: string,
  text: string,
  senderOpts: any
): void => {
  const MOD_CHAT_ID = '-405342289';
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `Allow`,
            callback_data: `allow:${content}:${text}:${senderOpts.chat_id}`,
          },
          {
            text: `Reject`,
            callback_data: `reject:${content}:${text}:${senderOpts.chat_id}`,
          },
        ],
      ],
    },
  };
  text = `A ${content} named ${text} has been requested by ${senderOpts.user}`;
  bot.sendMessage(MOD_CHAT_ID, text, opts);
};

const searchQuery = async (content: string, query: string): Promise<any> => {
  const buttons: any = [];
  console.log(query);
  const searchResult = await search(query);
  if (searchResult.length <= 0) {
    return buttons;
  }
  const queryKey = Math.random().toString(36).substring(7);
  for (var i = 0; i <= 5; i++) {
    const callback = Math.random().toString(36).substring(7) + ':' + queryKey;

    client.set(callback, searchResult[i]);

    buttons.push([
      {
        text: `${searchResult[i].name}`,
        callback_data: `${callback}`,
      },
    ]);
  }
  buttons.push([
    {
      text: 'REJECT',
      callback_data: `reject:${content}:${query}`,
    },
  ]);
  return buttons;
};

const getMagnet = async (
  action: any,
  msg: TelegramBot.Message
): Promise<void> => {
  let opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  };

  client.get(action, function (err, data: any) {
    if (err) {
      console.log(err);
    } else {
      if (data.magnet === undefined) {
        bot.editMessageText('Failed to get the magnet link', opts);
      } else {
        bot.editMessageText(`Downloading ${data.name}`, opts);
        mirror(msg, data.magnet);
      }
    }
  });
};
