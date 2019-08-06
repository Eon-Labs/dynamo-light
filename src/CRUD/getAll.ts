import { concatBatchFetchResult } from "../helper";

/**
 * Get all items from table
 * */
export default async function getAll({
  docClient,
  tableName,
  indexName,
  options = {},
  pagination = false,
  verbose = false
}) {
  let params;
  try {
    params = {
      TableName: tableName,
      ...(indexName && { IndexName: indexName }),
      ...options
    };
    verbose && console.log("params", params);
    let result;
    let shouldKeepFetching;
    while (!result || shouldKeepFetching) {
      // eslint-disable-next-line no-await-in-loop
      const fetchedData = await docClient.scan(params).promise();
      const { LastEvaluatedKey } = fetchedData;
      result = concatBatchFetchResult(result, fetchedData);
      params.ExclusiveStartKey = LastEvaluatedKey;
      if (params.Limit) {
        params.Limit -= fetchedData.Items.length;
      }
      shouldKeepFetching = !pagination && params.Limit > 0 && LastEvaluatedKey !== "undefined";
    }
    verbose && console.log(`Successfully scanned ${result.Count} items from table ${tableName}`);
    return result;
  } catch (error) {
    console.error(`Unable to get all items from ${tableName}. Error JSON:`, JSON.stringify(error), error.stack);
    console.log("params", JSON.stringify(params));
    throw error;
  }
}
