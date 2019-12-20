/* *
* This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
* Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
* session persistence, api calls, and more.
* */
const Alexa = require('ask-sdk-core');
// i18n library dependency, we use it below in a localisation interceptor
const i18n = require('i18next');
// i18n strings for all supported locales
const languageStrings = require('./languageStrings');

const util = require('./util');

const translinkHelper = require('./translink');
const locationHelper = require('./location');

const handleError = (handlerInput, err) => {
  const speakOutput = handlerInput.t('ERROR_MSG');
  console.log(`~~~~ Error handled: ${err.message !== undefined ? err.message : JSON.stringify(err)}`);

  return handlerInput.responseBuilder
    .speak(speakOutput)
    .reprompt(speakOutput);
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const speakOutput = handlerInput.t('WELCOME_MSG');
    await locationHelper.getDeviceLocation(handlerInput);
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const GetNextBusIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetNextBusIntent';
  },
  async handle(handlerInput) {
    const location = await locationHelper.getDeviceLocation(handlerInput);
    const nearbyStops = await translinkHelper.getNearbyStops(handlerInput, location);
    const stopNumber = nearbyStops[0].StopNo;
    const busEstimates = await translinkHelper.getBusEstimates(stopNumber);
    const nextBus = busEstimates[0];
    const nextArrival = busEstimates[0].Schedules[0];

    let speakOutput = handlerInput.t('NEXT_BUS_MSG');
    speakOutput = util.replaceStringTags(speakOutput, {
      stopNumber,
      busNumber: nextBus.RouteNo,
      time: nextArrival.ExpectedLeaveTime,
    });

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = handlerInput.t('HELP_MSG');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
    || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = handlerInput.t('GOODBYE_MSG');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

/* *
* FallbackIntent triggers when a customer says something that doesn’t map to any intents in your
* skill it must also be defined in the language model (if the locale supports it)
* This handler can be safely added but will be ingnored in locales that do not support it yet
* */
const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    const speakOutput = handlerInput.t('FALLBACK_MSG');

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
/* *
* SessionEndedRequest notifies that a session was ended. This handler will be triggered when a
* currently open session is closed for one of the following reasons: 1) The user says 'exit'
* or 'quit'. 2) The user does not respond or says something that does not match an intent
*  defined in your voice model. 3) An error occurs
* */
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
  },
};
/* *
* The intent reflector is used for interaction model testing and debugging.
* It will simply repeat the intent the user said. You can create custom handlers for your intents
* by defining them above, then also adding them to the request handler chain below
* */
const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = handlerInput.t('REFLECTOR_MSG', { intentName });

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};
/**
* Generic error handling to capture any syntax or routing errors. If you receive an error
* stating the request handler chain is not found, you have not implemented a handler for
* the intent being invoked or included it in the skill builder below
* */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, err) {
    return handleError(handlerInput, err);
  },
};

// This request interceptor will bind a translation function 't' to the handlerInput
const LocalisationRequestInterceptor = {
  process(handlerInput) {
    i18n.init({
      lng: Alexa.getLocale(handlerInput.requestEnvelope),
      resources: languageStrings,
    }).then((t) => {
      // eslint-disable-next-line no-param-reassign
      handlerInput.t = (...args) => t(...args);
    });
  },
};
/**
* This handler acts as the entry point for your skill, routing all request and response
* payloads to the handlers above. Make sure any new handlers or interceptors you've
* defined are included below. The order matters - they're processed top to bottom
* */

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetNextBusIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(LocalisationRequestInterceptor)
  .withCustomUserAgent('sample/hello-world/v1.2')
  .lambda();
