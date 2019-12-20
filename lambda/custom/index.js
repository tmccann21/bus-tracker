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


const ARCGIS_API_URL = 'geocode.arcgis.com';
const ARCGIS_API_ENDPOINT = `/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine={address}`;

const TRANSLINK_API_KEY = util.getEnvironmentVariable('TRANSLINK_API_KEY');
const TRANSLINK_API_URL = 'api.translink.ca';
const TRANSLINK_NEARBY_STOPS_ENDPOINT = `/rttiapi/v1/stops?apikey=${TRANSLINK_API_KEY}&lat={lat}&long={lon}`;
const TRANSLINK_NEXT_BUS_ENDPOINT = `/rttiapi/v1/stops/{stopNumber}/estimates?apikey=${TRANSLINK_API_KEY}&count=2&timeframe=120`;

const requestAddress = async (context) => {
  const apiEndpoint = context.System.apiEndpoint.replace('https://', '');
  const { apiAccessToken } = context.System;
  const { deviceId } = context.System.device;

  const requestOptions = {
    host: apiEndpoint,
    path: `/v1/devices/${deviceId}/settings/address`,
    headers: {
      Authorization: `Bearer ${apiAccessToken}`,
    },
  };

  return util.get(requestOptions);
};

const requestLocation = async (address) => {
  const combinedAddress = `${address.addressLine1 || ''} ${address.city || ''}, ${address.stateOrRegion || ''}. ${address.countryCode || ''} ${address.postalCode || ''}}`;
  const queryAddress = encodeURI(combinedAddress);
  const endpoint = util.replaceStringTags(ARCGIS_API_ENDPOINT, {
    address: queryAddress,
  });

  const requestOptions = {
    host: ARCGIS_API_URL,
    path: endpoint,
  };

  return util.get(requestOptions);
};

const requestNearbyStops = async (location) => {
  const requestOptions = {
    host: TRANSLINK_API_URL,
    path: util.replaceStringTags(TRANSLINK_NEARBY_STOPS_ENDPOINT, {
      lat: location.lat,
      lon: location.lon,
    }),
    headers: {
      Accept: 'application/json',
    },
  };

  return util.get(requestOptions);
};

const requestBusEstimates = async (stopNumber) => {
  const requestOptions = {
    host: TRANSLINK_API_URL,
    path: util.replaceStringTags(TRANSLINK_NEXT_BUS_ENDPOINT, {
      stopNumber,
    }),
    headers: {
      Accept: 'application/json',
    },
  };

  return util.get(requestOptions);
};

const requestLocationPermission = (handlerInput) => handlerInput.responseBuilder
  .speak(handlerInput.t('REQUEST_PERMISSION_MSG'))
  .withAskForPermissionsConsentCard([
    'alexa::devices:all:address:full:read',
  ])
  .getResponse();

const getDeviceLocation = async (handlerInput) => {
  const session = handlerInput.attributesManager.getSessionAttributes();
  const { context } = handlerInput.requestEnvelope;

  if (session.location !== undefined) {
    return session.location;
  }
  const address = await requestAddress(context);
  if (address.statusCode === 403) {
    return requestLocationPermission(handlerInput);
  }
  if (address.statusCode !== 200) {
    throw new Error(`bad response from amazon API ${address.statusCode}`);
  }

  const geocoded = await requestLocation(address.body);
  if (geocoded.statusCode === 200 && geocoded.body && geocoded.body.candidates.length > 0) {
    const responseLocation = geocoded.body.candidates[0].location;
    const location = {
      lat: responseLocation.y.toString().substring(0, 8),
      lon: responseLocation.x.toString().substring(0, 8),
    };
    session.location = location;
    handlerInput.attributesManager.setSessionAttributes(session);

    return location;
  }
  throw new Error(`bad response from arcgis API ${geocoded.statusCode}`);
};

const getNearbyStops = async (handlerInput) => {
  const session = handlerInput.attributesManager.getSessionAttributes();
  if (session.nearbyStops !== undefined) {
    return session.nearbyStops;
  }
  const location = await getDeviceLocation(handlerInput);
  const nearbyStopsRequest = await requestNearbyStops(location);
  if (nearbyStopsRequest.statusCode === 200) {
    session.nearbyStops = nearbyStopsRequest.body;
    handlerInput.attributesManager.setSessionAttributes(session);

    return nearbyStopsRequest.body;
  }
  throw new Error(`bad response from translink nearby stops ${nearbyStopsRequest.statusCode}`);
};

const getBusEstimates = async (stopNumber) => {
  const estimateRequest = await requestBusEstimates(stopNumber);
  if (estimateRequest.statusCode === 200) {
    return estimateRequest.body;
  }

  throw new Error(`bad response from translink estimates ${estimateRequest.statusCode}`);
};

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
    await getDeviceLocation(handlerInput);
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
    const nearbyStops = await getNearbyStops(handlerInput);
    const stopNumber = nearbyStops[0].StopNo;
    const busEstimates = await getBusEstimates(stopNumber);
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
