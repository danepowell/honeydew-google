// Initialize Google.
const { dialogflow, SignIn } = require('actions-on-google');
const app = dialogflow({ debug: true });

// Other libraries.
const honeydewVoice = require('honeydew-voice');
const winston = require('winston');
const warmer = require('lambda-warmer');

// Initialize logger.
let log_level = 'info';
if (process.env.NODE_ENV !== 'production') {
  log_level = 'debug';
}
const logger = winston.createLogger({
  level: log_level,
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console()
  ]
});

app.intent('Default Welcome Intent', conv => {
  if (conv.user.access.token) {
    return conv.ask('You can add items to your grocery list by saying things like "add milk".');
  }
  else {
    return conv.ask(new SignIn('To use Honeydew'));
  }
});

app.intent('post sign in', conv => {
  if (conv.user.access.token) {
    return conv.ask('Great, you are signed in to Honeydew. Now try adding an item to your grocery list. For instance, say "add milk"');
  }
});

app.intent('add item', async (conv, { item }) => {
  const itemName = item;
  const sessionToken = conv.user.access.token;

  try {
    await honeydewVoice.addItem(itemName, sessionToken);
  }
  catch (error) {
    switch (error) {
      case 'Missing item name':
        return conv.close('Sorry, I did not hear an item name.');
      case 'Invalid session token':
        return conv.ask(new SignIn('To add items'));
      case 'invalid session token':
        return conv.close('Your session token is invalid. Please use the Alexa app to unlink and re-link your account.');
      case 'No active subscription':
        return conv.close('You do not have an active subscription. Please use the Android app to renew your subscription.');
      default:
        return conv.close('Sorry, due to a technical problem I was not able to add this item.');
    }
  }
  var message = 'Okay, I added ' + itemName + ' to your grocery list.';
  return conv.close(message);
});

exports.fulfillment = function(event, context, callback) {
  warmer(event).then(isWarmer => {
    if (isWarmer) {
      logger.info('Keeping warm.');
      callback(null, 'warmed');
    }
    else {
      logger.info('Google request received.');
      app(event, context, callback);
    }
  });
};
