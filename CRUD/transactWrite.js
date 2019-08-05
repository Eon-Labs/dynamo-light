/**
 * Transact write from table
 */
async function transactWrite({ docClient, transactions, options, verbose }) {
  let params;
  try {
    const {
      ClientRequestToken,
      ReturnConsumedCapacity = "TOTAL",
      ReturnItemCollectionMetrics = "NONE"
    } = options;

    params = {
      TransactItems: transactions,
      ...(ClientRequestToken && { ClientRequestToken }),
      ...(ReturnConsumedCapacity && { ReturnConsumedCapacity }),
      ...(ReturnItemCollectionMetrics && { ReturnItemCollectionMetrics })
    };

    const data = await docClient.transactWrite(params).promise();
    verbose && console.log(`Successfully performed transactionWrite`, data);
    return data;
  } catch (err) {
    console.error(
      `Unable to perform transact write operation ${JSON.stringify(transactions)}. Error JSON:`,
      JSON.stringify(err),
      err.stack
    );
    console.log("params", JSON.stringify(params));
    throw err;
  }
}

module.exports = transactWrite;
