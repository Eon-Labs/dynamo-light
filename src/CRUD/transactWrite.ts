import type { IDLArgumentsBase } from "../types";
import type { DocumentClient } from "aws-sdk/clients/dynamodb";

type IDLTrxWriteOptionBase = Omit<DocumentClient.TransactWriteItemsInput, "TransactItems">;

interface IDLTrxWriteOptions extends IDLTrxWriteOptionBase {
  verbose?: boolean;
}

interface IDLTrxWrite extends IDLArgumentsBase<IDLTrxWriteOptions> {
  transactions: DocumentClient.TransactWriteItemList;
}

/**
 * Transact write from table
 */
export default async function transactWrite({
  docClient,
  transactions,
  options,
  verbose = false,
}: Omit<IDLTrxWrite, "tableName">) {
  const { ClientRequestToken, ReturnConsumedCapacity = "TOTAL", ReturnItemCollectionMetrics = "NONE" } = options;

  const params: DocumentClient.TransactWriteItemsInput = {
    TransactItems: transactions,
    ...(ClientRequestToken && { ClientRequestToken }),
    ...(ReturnConsumedCapacity && { ReturnConsumedCapacity }),
    ...(ReturnItemCollectionMetrics && { ReturnItemCollectionMetrics }),
  };

  try {
    const data = await docClient.transactWrite(params).promise();
    if (verbose) {
      console.log(`Successfully performed transactionWrite`, data);
    }
    return data;
  } catch (err) {
    if (verbose) {
      console.error(
        `Unable to perform transact write operation ${JSON.stringify(transactions)}. Error JSON:`,
        JSON.stringify(err),
        (err as any).stack
      );
      console.log("params", JSON.stringify(params));
    }
    throw err;
  }
}
