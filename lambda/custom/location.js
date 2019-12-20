const util = require('./util');

const ARCGIS_API_URL = 'geocode.arcgis.com';
const ARCGIS_API_ENDPOINT = `/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine={address}`;

const requestLocationPermission = (handlerInput) => handlerInput.responseBuilder
  .speak(handlerInput.t('REQUEST_PERMISSION_MSG'))
  .withAskForPermissionsConsentCard([
    'alexa::devices:all:address:full:read',
  ])
  .getResponse();

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

module.exports = {
  getDeviceLocation,
};
