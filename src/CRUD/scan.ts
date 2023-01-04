import { ScanCommand, ScanCommandInput, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { IDLArgumentsBase } from "../types";
import { concatBatchFetchResult } from "../utils/helper";

interface IDLScan extends IDLArgumentsBase<ScanCommandInput> {
  pagination: boolean;
  indexName: string;
}

/**
 * Get all items from table
 */
export default async function getAll({
  docClient,
  tableName,
  indexName,
  options = {},
  pagination = false,
  verbose = false,
}: IDLScan) {
  const params: ScanCommandInput = {
    TableName: tableName,
    ...(indexName && { IndexName: indexName }),
    ...options,
  };
  try {
    if (verbose) {
      console.log("params", params);
    }
    let result;
    let shouldKeepFetching = true;
    while (!result || shouldKeepFetching) {
      // eslint-disable-next-line no-await-in-loop
      const fetchedData: ScanCommandOutput = await docClient.send(new ScanCommand(params));
      const { LastEvaluatedKey } = fetchedData;
      result = concatBatchFetchResult(result, fetchedData);
      params.ExclusiveStartKey = LastEvaluatedKey;
      if (params.Limit) {
        params.Limit -= fetchedData.Items?.length ?? 0;
      }
      const wantToFetchMore = (params.Limit === undefined || params.Limit > 0) && !pagination;
      const hasMoreToFetch = !!LastEvaluatedKey;
      shouldKeepFetching = wantToFetchMore && hasMoreToFetch;
    }
    if (verbose) {
      console.log(`Successfully scanned ${result.Count} items from table ${tableName}`);
    }
    return result;
  } catch (error) {
    if (verbose) {
      console.error(
        `Unable to get all items from ${tableName}. Error JSON:`,
        JSON.stringify(error),
        (error as { stack: any }).stack
      );
      console.log("params", JSON.stringify(params));
    }
    throw error;
  }
}
