/**
 * Get Item from table
 */
export default async function get({ docClient, tableName, key, options = {}, verbose = false, forTrx = false }) {
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
    params = {
      TableName: tableName,
      Key: key,
      ...options
    };
    if (verbose) {
      console.log("params", params);
    }

    /**
     * Return params for this requirement, used for transact method
     */
    if (forTrx) {
      return {
        Get: params
      };
    }

    const data = await docClient.get(params).promise();
    if (verbose) {
      console.log(`Successfully got item from table ${tableName}`, data);
    }
    if (!data.Item) {
      data.Item = null;
      // throw new Error(`No item found with key = ${JSON.stringify(key)}`);
    }

    return data;
  } catch (err) {
    if (verbose) {
      console.error(`Unable to get item from ${tableName}. Error JSON:`, JSON.stringify(err), err.stack);
      console.log("Error request params: ", JSON.stringify(params));
    }
    throw err;
  }
}
