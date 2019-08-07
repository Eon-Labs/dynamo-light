const orderTable = new Table("order");
// 只需要告诉table name, script会自动帮你parse primary/sortKey, indexes等等

order = await orderTable.get("1cjdks32-dcj32ic-cmsjcce"); // 会用getItem获得对应的record
order = await orderTable.get({ id: "1cjdks32-dcj32ic-cmsjcce", date: 1565034839932 }); // 会用getItem获得对应的record

const createdOrder = await orderTable.put({
  id: "sadc12s-dfw313w-d23i3kjc",
  symbol: "ETH/USDC",
  createdAt: 1565034839932
}); // 会用getItem获得对应的record

await orderTable.delete("sadc12s-dfw313w-d23i3kjc"); // delete record

await orderTable.delete(
  {
    id: "sadc12s-dfw313w-d23i3kjc"
  },
  {
    forTrx: false,
    verbose: true
  }
); // delete record

await orderTable.update("1cjdks32-dcj32ic-cmsjcce", { amount: 12 }); // 设置amount为12
// await orderTable.atomicUpdate("1cjdks32-dcj32ic-cmsjcce", { amount: -2.3 }); // 原有基础上-2.3

await orderTable.update(
  "1cjdks32-dcj32ic-cmsjcce",
  { amount: -2.3 },
  {
    pagination: false,
    verbose: true
  }
); // 设置amount为12

await orderTable.update(
  "1cjdks32-dcj32ic-cmsjcce",
  { amount: -2.3 },
  {
    pagination: false,
    verbose: true
  }
); // 设置amount为12
await orderTable.update("1cjdks32-dcj32ic-cmsjcce", { amount: 12 }); // 设置amount为12

const orders = await orderTable.query({
  indexName: "symbol_exchange",
  symbol: "BTC/USDT",
  exchange: "binance"
});

const allOrders = await orderTable.scan({
  params: {
    indexName: "symbol_exchange",
    symbol: "BTC/USDT",
    exchange: "binance"
  },
  options: { pagination: false }
});

const allOrders = await orderTable.scan({
  options: {
    pagination: false,
    verbose: true
  }
});

// orderTable.addIndex("user_date", "userId", "createdAt");
// orderTable.addIndex("symbol_exchange", "symbol", "exchange");

const principalTable = new Table("principal");
const principalKing = await principalTable.get("theIdOfAKing");

await studentTable.put({
  id: "123ads-sdasdf-2dfked2s",
  name: "John",
  age: 11,
  grade: 5
});

const john = await studentTable.get("123ads-sdasdf-2dfked2s");
const john = await studentTable.get({ id: "123ads-sdasdf-2dfked2s" });

const principalTable = new Table({ name: "Principal" });

principalTable.get("123123");

principalTable.update("123casdc", { name: "123123", age: 112 });
principalTable.update({ class: "370227", name: "asdfasdf" }, { name: "123123", age: 112 });
principalTable.delete("123123");
principalTable.update({ primaryKey: "370227", partitionKey: "asdfasdf" }, { name: "123123", age: 112 });
