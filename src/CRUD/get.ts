import { GetCommand, GetCommandInput, GetCommandOutput } from "@aws-sdk/lib-dynamodb";
import { ResponseMetadata } from "@aws-sdk/types/dist-types/response";
import { IDLArgumentsBase } from "../types";

interface IDLGet extends IDLArgumentsBase<GetCommandInput> {
  key: any;
  forTrx: boolean;
}

export interface IDLGetOutput extends Omit<GetCommandOutput, "$metadata"> {
  Get?: GetCommandInput; // only when forTrx == true
  $metadata?: ResponseMetadata;
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
}: IDLGet): Promise<IDLGetOutput> {
  /**
   * Param verification
   */
  if (!key) {
    throw new Error("key is undefined!");
  }
  /**
   * Construct database request
   */
  const params: GetCommandInput = {
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

    const data: GetCommandOutput = await docClient.send(new GetCommand(params));
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
