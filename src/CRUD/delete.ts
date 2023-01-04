import { DeleteCommand, DeleteCommandInput, DeleteCommandOutput } from "@aws-sdk/lib-dynamodb";
import { IDLArgumentsBase } from "../types";

interface IDLDelete extends IDLArgumentsBase<DeleteCommandInput> {
  forTrx: boolean;
  key: any;
}

/**
 * Deletes an item from the table
 */
export default async function deleteItem({
  docClient,
  tableName,
  key,
  options = {},
  verbose = false,
  forTrx = false
}: IDLDelete) {
  let params;
  try {
    if (!key) {
      throw new Error("key is undefined!");
    }
    const { ReturnValues = "ALL_OLD" } = options;
    params = {
      TableName: tableName,
      Key: key,
      ReturnValues,
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
        Delete: params
      };
    }

    const data: DeleteCommandOutput = await docClient.send(new DeleteCommand(params));
    if (!data.Attributes) {
      throw new Error(`Key ${JSON.stringify(key)} already does not exist, try again.`);
    } else {
      if (verbose) {
        console.log(`Successfully deleted item from table ${tableName}`, data);
      }
      return data;
    }
  } catch (error) {
    if (verbose) {
      console.error(error);
      console.log("params", JSON.stringify(params));
    }
    throw error;
  }
}
