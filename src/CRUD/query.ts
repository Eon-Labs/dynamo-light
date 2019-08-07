import { buildKeyConditionExpressions, concatBatchFetchResult, mergeOptions } from "../utils/helper";

export default async function query({
  docClient,
  tableName,
  indexName,
  partitionKey,
  partitionKeyValue,
  sortKey,
  sortKeyOperator,
  sortKeyValue,
  options = {},
  pagination = false,
  verbose = false
}) {
  let params;
  try {
    /**
     * Check for errors
     */
    if (!partitionKey || !partitionKeyValue) {
      throw new Error(
        `Query fail: argument partitionKey - ${partitionKey} or partitionKeyValue ${partitionKeyValue} is invalid`
      );
    }
    if (sortKey) {
      if (!sortKeyValue || !sortKeyOperator) {
        throw new Error(`Query fail: both sortKeyValue and sortKeyOperator are required`);
      }
    }

    /**
     * Update query options / params
     */
    const keyConditionExpressions = buildKeyConditionExpressions({
      partitionKey,
      partitionKeyValue,
      sortKey,
      sortKeyOperator,
      sortKeyValue
    });

    params = mergeOptions(
      {
        TableName: tableName,
        ...(indexName && { IndexName: indexName }),
        ...keyConditionExpressions
      },
      options
    );
    if (verbose) {
      console.log("params", params);
    }
    /**
     * Make the query
     */
    let result;
    let shouldKeepFetching;
    while (!result || shouldKeepFetching) {
      // eslint-disable-next-line no-await-in-loop
      const fetchedData = await docClient.query(params).promise();
      const { LastEvaluatedKey } = fetchedData;
      result = concatBatchFetchResult(result, fetchedData);
      params.ExclusiveStartKey = LastEvaluatedKey;
      if (params.Limit) {
        params.Limit -= fetchedData.Items.length;
      }
      const noItemsToFetch = !fetchedData || !fetchedData.Items || fetchedData.Items.length === 0;
      shouldKeepFetching = !pagination && params.Limit > 0 && LastEvaluatedKey !== "undefined" && !noItemsToFetch;
    }
    if (verbose) {
      console.log(`Successfully queried ${result.Count} items from table ${tableName}`);
    }
    return result;
  } catch (error) {
    console.error(`Unable to query items from ${tableName}. Error JSON:`, JSON.stringify(error), error.stack);
    console.log("params", JSON.stringify(params));
    throw error;
  }
}
