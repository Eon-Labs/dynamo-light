// eslint-disable-next-line import/no-unresolved
const AWS = require("aws-sdk");

const docClient = new AWS.DynamoDB.DocumentClient();
const { buildKeyConditionExpressions, mergeOptions, concatBatchFetchResult } = require("../helper");

async function query({
  tableName,
  indexName = undefined,
  hashKey,
  hashKeyValue,
  sortKey = undefined,
  sortKeyOperator = undefined,
  sortKeyValue = undefined,
  options = {},
  pagination = false,
  verbose = false
}) {
  let params;
  try {
    /**
     * Check for errors
     */
    if (!hashKey || !hashKeyValue) {
      throw new Error(
        `Query fail: argument hashKey - ${hashKey} or hashKeyValue ${hashKeyValue} is invalid`
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
      hashKey,
      hashKeyValue,
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
    verbose && console.log("params", params);
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
      shouldKeepFetching =
        !pagination && params.Limit > 0 && LastEvaluatedKey !== "undefined" && !noItemsToFetch;
    }
    verbose && console.log(`Successfully queried ${result.Count} items from table ${tableName}`);
    return result;
  } catch (error) {
    console.error(
      `Unable to query items from ${tableName}. Error JSON:`,
      JSON.stringify(error),
      error.stack
    );
    console.log("params", JSON.stringify(params));
    throw error;
  }
}

module.exports = query;
