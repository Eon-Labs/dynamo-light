/**
 * Create Item in table, 'createdAt' and 'updatedAt' timeStamps will be added in each item
 */
export default async function create({ docClient, tableName, item, options = {}, verbose = false, forTrx = false }) {
  let params;
  try {
    const timeStamp = Date.now();

    params = {
      TableName: tableName,
      Item: {
        ...item,
        createdAt: timeStamp,
        updatedAt: timeStamp
      },
      ...options
    };
    verbose && console.log("params", params);

    /**
     * Return params for this requirement, used for transact method
     */
    if (forTrx) {
      return {
        Put: params
      };
    }

    await docClient.put(params).promise();
    verbose && console.log(`Successfully inserted item into table ${tableName}`);
    return params;
  } catch (err) {
    console.error(`Unable to insert item into ${tableName}. Error JSON:`, JSON.stringify(err), err.stack);
    console.log("params", JSON.stringify(params));
    throw err;
  }
}
