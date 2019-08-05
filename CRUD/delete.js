// eslint-disable-next-line import/no-unresolved
const AWS = require("aws-sdk");

const docClient = new AWS.DynamoDB.DocumentClient();

/**
 * Deletes an item from the table
 */
async function deleteItem({ tableName, key, options = {}, verbose = false, forTrx = false }) {
  let params;
  try {
    if (!key) {
      throw new Error("key is undefined!");
    }
    const { ReturnValues = "ALL_OLD" } = options;
    params = {
      TableName: tableName,
      Key: key,
      ReturnValues,
      ...options
    };
    verbose && console.log("params", params);

    /**
     * Return params for this requirement, used for transact method
     */
    if (forTrx) {
      return {
        Delete: params
      };
    }

    const data = await docClient.delete(params).promise();
    if (!data.Attributes) {
      throw new Error(`Key ${JSON.stringify(key)} already does not exist, try again.`);
    } else {
      verbose && console.log(`Successfully deleted item from table ${tableName}`, data);
      return data;
    }
  } catch (error) {
    console.error(error);
    console.log("params", JSON.stringify(params));
    throw error;
  }
}

module.exports = deleteItem;
