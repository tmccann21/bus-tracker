/* *
* We create a language strings object containing all of our strings.
* The keys for each string will then be referenced in our code, e.g. handlerInput.t('WELCOME_MSG').
* The localisation interceptor in index.js will automatically choose the strings
* that match the request's locale.
* */

module.exports = {
  en: {
    translation: {
      WELCOME_MSG: 'Welcome, try asking for the next bus by saying next bus',
      NEXT_BUS_MSG: 'The next {busNumber} at {onStreet} and {atStreet} is arriving at {time}',
      HELP_MSG: 'You can say hello to me! How can I help?',
      GOODBYE_MSG: 'Goodbye!',
      REFLECTOR_MSG: 'You just triggered {{intentName}}',
      FALLBACK_MSG: 'Sorry, I don\'t know how to do that. Please try again or say help for sample commands',
      ERROR_MSG: 'Sorry, I had trouble doing what you asked. Please try again.',
      REQUEST_PERMISSION_MSG: 'Please enable device address information through the alexa app',
      MISSING_NUMBER_MSG: 'Please provide a bus number so we can give you an arrival estimate',
    },
  },
};
