const TableModel = require("../../index");
const {
  APIKeyTable,
  TransactionTable,
  UserBalanceIndexUsername,
  UserBalanceTable,
  ExecutionTable,
  ExecutionIndexExchangePair,
  ExecutionIndexActiveTradeStatus,
  ExecutionIndexUsername,
  ExecutionHistoricalTable,
  ZLBalanceTable
} = require("./test_config");

class APIKey extends TableModel {
  constructor() {
    super(APIKeyTable);
  }
}

class Transaction extends TableModel {
  constructor() {
    super({
      ...TransactionTable,
      indexes: []
    });
  }
}

class ExecutionHistorical extends TableModel {
  constructor() {
    super({
      ...ExecutionHistoricalTable,
      indexes: []
    });
  }
}

class UserBalances extends TableModel {
  constructor() {
    super({
      ...UserBalanceTable,
      indexes: [UserBalanceIndexUsername]
    });
  }

  queryByUsername({ username }, options = null) {
    const queryOptions = options;
    return super.query(
      {
        tableName: this.tableName,
        indexName: UserBalanceIndexUsername.name,
        hashKey: UserBalanceIndexUsername.hashKey,
        hashKeyValue: username
      },
      queryOptions
    );
  }
}

class ZLBalances extends TableModel {
  constructor() {
    super({
      ...ZLBalanceTable
    });
  }
}

class Execution extends TableModel {
  constructor() {
    super({
      ...ExecutionTable,
      indexes: [ExecutionIndexExchangePair, ExecutionIndexActiveTradeStatus, ExecutionIndexUsername]
    });
  }
}

module.exports = {
  APIKey,
  Transaction,
  UserBalances,
  Execution,
  ExecutionHistorical,
  ZLBalances
};
