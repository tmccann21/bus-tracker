const util = require('./util');

const TRANSLINK_API_KEY = util.getEnvironmentVariable('TRANSLINK_API_KEY');
const TRANSLINK_API_URL = 'api.translink.ca';
const TRANSLINK_NEARBY_STOPS_ENDPOINT = `/rttiapi/v1/stops?apikey=${TRANSLINK_API_KEY}&lat={lat}&long={lon}`;
const TRANSLINK_NEXT_BUS_ENDPOINT = `/rttiapi/v1/stops/{stopNumber}/estimates?apikey=${TRANSLINK_API_KEY}&count=2&timeframe=120`;

const padRouteNumber = (route) => {
  let paddedRoute = route;
  while (paddedRoute.length < 3) {
    paddedRoute = `0${paddedRoute}`;
  }

  return paddedRoute;
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

const getBusEstimates = async (stopNumber) => {
  const estimateRequest = await requestBusEstimates(stopNumber);
  if (estimateRequest.statusCode === 200) {
    return estimateRequest.body;
  }

  throw new Error(`bad response from translink estimates ${estimateRequest.statusCode}`);
};

const getNearbyStops = async (handlerInput, location) => {
  const session = handlerInput.attributesManager.getSessionAttributes();
  if (session.nearbyStops !== undefined) {
    return session.nearbyStops;
  }
  const nearbyStopsRequest = await requestNearbyStops(location);
  if (nearbyStopsRequest.statusCode === 200) {
    session.nearbyStops = nearbyStopsRequest.body;
    handlerInput.attributesManager.setSessionAttributes(session);

    return nearbyStopsRequest.body;
  }
  throw new Error(`bad response from translink nearby stops ${nearbyStopsRequest.statusCode}`);
};

module.exports = {
  getNearbyStops,
  getBusEstimates,
  padRouteNumber,
};
