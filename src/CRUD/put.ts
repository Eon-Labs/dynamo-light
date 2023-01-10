import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { IDLArgumentsBase } from "../types";

interface IDLPut extends IDLArgumentsBase<PutCommandInput> {
  autoTimeStamp?: boolean;
  forTrx?: boolean;
  item: any;
}

/**
 * Create Item in table, 'createdAt' and 'updatedAt' timeStamps will be added in each item
 */
export default async function create({
  docClient,
  tableName,
  item: rawItem,
  options = {},
  verbose = false,
  forTrx = false,
  autoTimeStamp = false,
}: IDLPut) {
  const item = {
    ...rawItem,
  };
  if (autoTimeStamp) {
    const timeStamp = Date.now();
    item.createdAt = timeStamp;
    item.updatedAt = timeStamp;
  }

  const params: PutCommandInput = {
    TableName: tableName,
    Item: item,
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
        Put: params,
      };
    }

    await docClient.send(new PutCommand(params));
    if (verbose) {
      console.log(`Successfully inserted item into table ${tableName}`);
    }
    return params;
  } catch (err) {
    if (verbose) {
      console.error(`Unable to insert item into ${tableName}. Error JSON:`, JSON.stringify(err), (err as any).stack);
      console.log("params", JSON.stringify(params));
    }
    throw err;
  }
}
