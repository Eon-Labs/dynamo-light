import { TransactWriteCommand, TransactWriteCommandInput, TransactWriteCommandOutput } from "@aws-sdk/lib-dynamodb";
import { IDLArgumentsBase } from "../types";

type IDLTrxWriteOptionBase = Omit<TransactWriteCommandInput, "TransactItems">;

interface IDLTrxWriteOptions extends IDLTrxWriteOptionBase {
  verbose?: boolean;
}

interface IDLTrxWrite extends IDLArgumentsBase<IDLTrxWriteOptions> {
  transactions: TransactWriteCommandInput["TransactItems"];
}

/**
 * Transact write from table
 */
export default async function transactWrite({
  docClient,
  transactions,
  options,
  verbose = false
}: Omit<IDLTrxWrite, "tableName">) {
  const { ClientRequestToken, ReturnConsumedCapacity = "TOTAL", ReturnItemCollectionMetrics = "NONE" } = options;

  const params: TransactWriteCommandInput = {
    TransactItems: transactions,
    ...(ClientRequestToken && { ClientRequestToken }),
    ...(ReturnConsumedCapacity && { ReturnConsumedCapacity }),
    ...(ReturnItemCollectionMetrics && { ReturnItemCollectionMetrics })
  };

  try {
    const data: TransactWriteCommandOutput = await docClient.send(new TransactWriteCommand(params));
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
