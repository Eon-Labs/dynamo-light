const AWS = require("aws-sdk");

const docClient = new AWS.DynamoDB.DocumentClient();

function setRegion(region) {
  AWS.config.update({ region });
}

module.exports = {
  setRegion,
  docClient
};
