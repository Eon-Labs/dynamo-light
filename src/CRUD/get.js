/**
 * Get Item from table
 */
async function get({ docClient, tableName, key, options = {}, verbose = false, forTrx = false }) {
  let params;
  try {
    /**
     * Param verification
     */

    if (!key) {
      throw new Error("key is undefined!");
    }
    /**
     * Construct database request
     */
    const { AttributesToGet = null, ConsistentRead = false } = options;
    params = {
      TableName: tableName,
      Key: key,
      AttributesToGet,
      ConsistentRead,
      ...options
    };
    verbose && console.log("params", params);

    /**
     * Return params for this requirement, used for transact method
     */
    if (forTrx) {
      return {
        Get: params
      };
    }

    const data = await docClient.get(params).promise();
    verbose && console.log(`Successfully got item from table ${tableName}`, data);
    if (!data.Item) {
      data.Item = null;
      // throw new Error(`No item found with key = ${JSON.stringify(key)}`);
    }

    return data;
  } catch (err) {
    console.error(
      `Unable to get item from ${tableName}. Error JSON:`,
      JSON.stringify(err),
      err.stack
    );
    console.log("params", JSON.stringify(params));
    throw err;
  }
}

module.exports = get;
