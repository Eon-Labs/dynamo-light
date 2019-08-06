const AWS = require("aws-sdk");

export const docClient = new AWS.DynamoDB.DocumentClient();

export function setRegion(region) {
  AWS.config.update({ region });
}
