const ExecutionHistoricalTable = {
  name: "ExecutionHistorical",
  hashKey: "orderId",
  sortKey: "itemDateTime"
};
const UserBalanceHistoricalTable = {
  name: "UserBalanceHistorical",
  hashKey: "usernameSymbol",
  sortKey: "itemDateTime"
};
const APIKeyTable = { name: "APIKeys", hashKey: "key" };
const UserBalanceTable = { name: "UserBalance", hashKey: "usernameSymbol" };
const UserBalanceIndexUsername = { name: "UsernameIndex", hashKey: "username" };
const ExecutionTable = { name: "Execution", hashKey: "orderId" };
const ExecutionIndexUsername = { name: "UsernameIndex", hashKey: "username", sortKey: "tradeTime" };
const ExecutionIndexActiveTradeStatus = {
  name: "activeTradeStatusIndex",
  hashKey: "activeTradeStatus",
  sortKey: "tradeTime"
};
const ExecutionIndexExchangePair = {
  name: "exchangePairIndex",
  hashKey: "exchangePair",
  sortKey: "tradeTime"
};

const TransactionTable = { name: "Transaction", hashKey: "username", sortKey: "itemDateTime" };

const ZLBalanceTable = { name: "ZL-Balances", hashKey: "exchangeAccount", sortKey: "timeStamp" };

module.exports = {
  ExecutionHistoricalTable,
  UserBalanceHistoricalTable,
  APIKeyTable,
  UserBalanceTable,
  UserBalanceIndexUsername,
  ExecutionTable,
  ExecutionIndexUsername,
  ExecutionIndexActiveTradeStatus,
  ExecutionIndexExchangePair,
  TransactionTable,
  ZLBalanceTable
};
