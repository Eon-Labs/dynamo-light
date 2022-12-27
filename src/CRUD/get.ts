import type { IDLArgumentsBase } from "../types";
import type { DocumentClient } from "aws-sdk/clients/dynamodb";

interface IDLGet extends IDLArgumentsBase<DocumentClient.GetItemInput> {
  key: any;
  forTrx: boolean;
}

/**
 * Get Item from table
 */
export default async function get({
  docClient,
  tableName,
  key,
  options = {},
  verbose = false,
  forTrx = false,
}: IDLGet) {
  /**
   * Param verification
   */
  if (!key) {
    throw new Error("key is undefined!");
  }
  /**
   * Construct database request
   */
  const params: DocumentClient.GetItemInput = {
    TableName: tableName,
    Key: key,
    ...options,
  };
  if (verbose) {
    console.log("params", params);
  }

  try {
    /**
     * Return params for this requirement, used for transact method
     */
    if (forTrx) {
      return {
        Get: params,
      };
    }

    const data = await docClient.get(params).promise();
    if (verbose) {
      console.log(`Successfully got item from table ${tableName}`, data);
    }
    if (!data.Item) {
      data.Item = undefined;
      // throw new Error(`No item found with key = ${JSON.stringify(key)}`);
    }

    return data;
  } catch (err) {
    if (verbose) {
      console.error(`Unable to get item from ${tableName}. Error JSON:`, JSON.stringify(err), (err as any).stack);
      console.log("Error request params: ", JSON.stringify(params));
    }
    throw err;
  }
}
