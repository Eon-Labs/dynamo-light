const TableModel = require("../../index");
const { mergeOptions } = require("../../helper");

const {
  ExecutionTable,
  ExecutionIndexUsername,
  ExecutionIndexExchangePair,
  ExecutionIndexActiveTradeStatus
} = require("./test_config");

const activeTradeStatusList = ["PARTIAL", "AWAITING", "PENDING", "CREATE"];
const parentOrderOptions = {
  FilterExpression: "orderType = :orderType",
  ExpressionAttributeValues: { ":orderType": "parentOrder" }
};

/**
 * Update dynamodb options based on input condition
 */
function updateOptionsBasedOnConditions({ parentOnly }, baseOptions) {
  let options = baseOptions;
  console.log("updateOptionsBasedOnConditions baseOptions", baseOptions);
  parentOnly && (options = mergeOptions(baseOptions, parentOrderOptions));
  console.log("updateOptionsBasedOnConditions options", options);
  return options;
}

class Order extends TableModel {
  constructor() {
    super({
      ...ExecutionTable,
      indexes: [ExecutionIndexUsername, ExecutionIndexExchangePair, ExecutionIndexActiveTradeStatus]
    });
  }

  create(baseArgs) {
    const args = { ...baseArgs };
    /**
     * Adding additional arguments for index hashKeys
     */
    const { tradeStatus, exchange, symbol } = args;
    if (
      !args[ExecutionIndexActiveTradeStatus.hashKey] &&
      tradeStatus &&
      activeTradeStatusList.includes(tradeStatus.toUpperCase())
    ) {
      args[ExecutionIndexActiveTradeStatus.hashKey] = tradeStatus.toUpperCase();
    }
    if (!args[ExecutionIndexExchangePair.hashKey] && exchange && symbol) {
      args[ExecutionIndexExchangePair.hashKey] = `${exchange}-${symbol}`;
    }
    return super.create(args);
  }

  queryByActiveTradeStatus({ activeTradeStatus, parentOnly }, options = null) {
    const queryOptions = updateOptionsBasedOnConditions({ parentOnly }, options);
    return super.query(
      {
        tableName: this.tableName,
        indexName: ExecutionIndexActiveTradeStatus.name,
        hashKey: ExecutionIndexActiveTradeStatus.hashKey,
        hashKeyValue: activeTradeStatus
      },
      queryOptions
    );
  }

  queryByActiveTradeStatusWithTimeRange({ activeTradeStatus, timeFrom, timeTo, parentOnly }, options = null) {
    const queryOptions = updateOptionsBasedOnConditions({ parentOnly }, options);
    return super.query(
      {
        tableName: this.tableName,
        indexName: ExecutionIndexActiveTradeStatus.name,
        hashKey: ExecutionIndexActiveTradeStatus.hashKey,
        hashKeyValue: activeTradeStatus,
        sortKey: ExecutionIndexActiveTradeStatus.sortKey,
        sortKeyOperator: "between",
        sortKeyValue: [timeFrom, timeTo]
      },
      queryOptions
    );
  }

  queryByExchangePair({ exchangePair, parentOnly }, options = null) {
    const queryOptions = updateOptionsBasedOnConditions({ parentOnly }, options);
    return super.query(
      {
        tableName: this.tableName,
        indexName: ExecutionIndexExchangePair.name,
        hashKey: ExecutionIndexExchangePair.hashKey,
        hashKeyValue: exchangePair
      },
      queryOptions
    );
  }

  queryByExchangePairWithTimeRange({ exchangePair, timeFrom, timeTo, parentOnly }, options = null) {
    const queryOptions = updateOptionsBasedOnConditions({ parentOnly }, options);
    return super.query(
      {
        tableName: this.tableName,
        indexName: ExecutionIndexExchangePair.name,
        hashKey: ExecutionIndexExchangePair.hashKey,
        hashKeyValue: exchangePair,
        sortKey: ExecutionIndexExchangePair.sortKey,
        sortKeyOperator: "between",
        sortKeyValue: [timeFrom, timeTo]
      },
      queryOptions
    );
  }

  queryByUsername({ username, parentOnly }, options = null) {
    const queryOptions = updateOptionsBasedOnConditions({ parentOnly }, options);

    return super.query(
      {
        tableName: this.tableName,
        indexName: ExecutionIndexUsername.name,
        hashKey: ExecutionIndexUsername.hashKey,
        hashKeyValue: username
      },
      queryOptions
    );
  }

  queryByUsernameWithTimeRange({ username, timeFrom, timeTo, parentOnly }, options = null) {
    const queryOptions = updateOptionsBasedOnConditions({ parentOnly }, options);

    return super.query(
      {
        tableName: this.tableName,
        indexName: ExecutionIndexUsername.name,
        hashKey: ExecutionIndexUsername.hashKey,
        hashKeyValue: username,
        sortKey: ExecutionIndexUsername.sortKey,
        sortKeyOperator: "between",
        sortKeyValue: [timeFrom, timeTo]
      },
      queryOptions
    );
  }
}

module.exports = Order;
