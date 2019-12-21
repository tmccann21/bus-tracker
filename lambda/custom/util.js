const AWS = require('aws-sdk');
const https = require('https');

const s3SigV4Client = new AWS.S3({
  signatureVersion: 'v4',
});

const getS3PreSignedUrl = function getS3PreSignedUrl(s3ObjectKey) {
  const bucketName = process.env.S3_PERSISTENCE_BUCKET;
  const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
    Bucket: bucketName,
    Key: s3ObjectKey,
    Expires: 60 * 1, // the Expires is capped for 1 minute
  });

  console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
  return s3PreSignedUrl;
};

const replaceStringTags = (str, tags) => {
  let replacedStr = str;
  Object.keys(tags).forEach((tagName) => {
    replacedStr = replacedStr.replace(`{${tagName}}`, tags[tagName]);
  });

  return replacedStr;
};

const get = async (options) => new Promise((resolve, reject) => {
  https.get(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);

        return resolve({
          statusCode: res.statusCode,
          body: jsonData,
        });
      } catch (err) {
        return reject(new Error(`error parsing JSON response from ${options.host}`));
      }
    });
  }).on('error', (err) => reject(err));
});

const getEnvironmentVariable = (name) => {
  if (!process.env[name]) {
    throw new Error(`env variable ${name} is unset!`);
  }

  return process.env[name];
};

/*
* Helper function to get filled slots
*/
const getSlotValues = (filledSlots) => {
  const slotValues = {};

  console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
  Object.keys(filledSlots).forEach((item) => {
    const { name } = filledSlots[item];
    if (filledSlots[name] && filledSlots[name].value !== '?') {
      slotValues[name] = filledSlots[name].value;
    }
  });

  return slotValues;
};

/*
* split a number into it's digits, and return as a string
* ex 50010. becomes 5 0 0 1 0
*/
const splitNumber = (number) => {
  let out = '';
  const strNumber = number.toString();
  for (let i = 0; i < strNumber.length - 1; i += 1) {
    out += `${strNumber.charAt(i)} `;
  }
  out += strNumber.charAt(strNumber.length - 1);

  return out;
};

module.exports = {
  getS3PreSignedUrl,
  replaceStringTags,
  getEnvironmentVariable,
  getSlotValues,
  splitNumber,
  get,
};
