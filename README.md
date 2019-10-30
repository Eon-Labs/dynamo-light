## A light library for easy access to dynamodb tables

<a href="https://www.npmjs.com/package/dynamo-light"><img src="https://img.shields.io/npm/v/dynamo-light.svg?style=flat" alt="npm version"></a>
<a href=""><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
<a href="https://github.com/prettier/prettier"><img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg"></a>
<a href="https://github.com/facebook/jest"><img src="https://img.shields.io/badge/tested_with-jest-99424f.svg" alt="Tested with Jest"></a>

### Installation

```
npm install --save dynamo-light
```

### AWS Configurations

Set AWS configurations in environment variables:

```javascript
export AWS_ACCESS_KEY_ID="Your AWS Access Key ID"
export AWS_SECRET_ACCESS_KEY="Your AWS Secret Access Key"
export AWS_REGION="us-west-2"
```

### Quick Start:

Assume you have a simple table - `Users` with partitionKey `userName` (demo purpose only, use unique field - such as uuid, in real projects).

```javascript
const { Table } = require("dynamo-light");
const userTable = new Table("Users");
```

#### Get:

```javascript
const user = await userTable.get("WarrenBuffett"); // implicit keyExpression
```

OR

```javascript
const user = await userTable.get({ userName: "WarrenBuffett" }); // explicit keyExpression
```

#### Put:

```javascript
await userTable.put({
  username: "JackMa",
  age: 53,
  occupation: "investor"
});
```

#### Update:

```javascript
await userTable.update("JackMa", {
  age: 54,
  occupation: "entrepreneur"
});
```

OR

```javascript
await userTable.update(
  { userName: "JackMa" },
  {
    age: 54,
    occupation: "entrepreneur"
  }
);
```

#### Delete:

```javascript
await userTable.delete("JackMa");
```

#### Scan:

```javascript
const users = await userTable.scan(); // with pagination
const users = await userTable.scan({}, { pagination: false }); // fetch all
```

## More examples:

### Tables with sortKey/hashKey:

For a table `populationTable` that has `country` as partitionKey and `year` as sortKey:

#### Get

```javascript
await populationTable.get({
  country: "Canada",
  year: 2000
});
```

#### Put

```javascript
await populationTable.put({
  country: "Canada",
  year: 2001,
  population: 31.01,
  unit: "million",
  alias: "CA"
});
```

#### Update:

```javascript
await populationTable.update(
  {
    country: "Canada",
    year: 2001
  },
  {
    population: 31.02
    // ... other new fields
  }
);
```

#### Delete:

```javascript
await populationTable.delete({
  country: "Canada",
  year: 2001
});
```

#### Query:

```javascript
await populationTable.query(
  {
    country: "Canada"
  },
  { pagination: false }
); // Returns all canada population records
```

```javascript
await populationTable.query({
  country: "Canada",
  year: 1949,
  sortKeyOperator: ">="
}); // Returns canada population records whose year is larger or equals to 1949
```

Here is a list of the available [sortKeyOperators](#available-sortkeyoperators).

 <!-- | BETWEEN -->

### Tables with indexes:

Assume table `populationTable` has a global secondary index `alias-year-index`. Its partitionKey is `alias` and sortKey is `year`:

#### Query:

```javascript
await populationTable.query({
  indexName: "alias-year-index",
  alias: "CA",
  year: 1949,
  sortKeyOperator: ">="
}); // Returns records whose year is larger or equals to 1949 and alias is "CA"
```

### Available SortKeyOperators:

= | < | <= | > | >= | BEGINS_WITH

 <!-- | BETWEEN -->

## Develop:

#### Test

Install dynamodb local:

```
npm run setupTestEnv
```

Spin up a local dynamodb and seed DB tables:

```
npm run startDynamo
```

In a different tab, you can run tests using

```
npm run test
```

<!-- ## More Examples:

Using for tables with sortKeys: -->

<!--
In case you want pagination,

```javascript
let result = await userTable.getAll();
console.log(result.Items); // Users with pagination. If LastEvaluatedKey exist, it means there are more data to get

if (result.LastEvaluatedKey) {
  const result = await userTable.getAll({}, { ExclusiveStartKey: result.LastEvaluatedKey });
  console.log(result.Items); // The next batch of users
}
```

<!--
### Extends Table model:

Example of a complex table model with **global secondary indexes** and **customized methods**:

```javascript
const TableModel = require("dynamo-light");

const UserBalanceHistoricalTable = {
  name: "UserBalanceHistorical",
  hashKey: "usernameSymbol",
  sortKey: "itemDateTime"
};
const UserBalanceIndexUsername = { name: "UsernameIndex", hashKey: "username" };

class UserBalance extends TableModel {
  constructor() {
    super({
      ...UserBalanceTable,
      indexes: [UserBalanceIndexUsername]
    });
  }

  // Define you customized method of the model
  getUserBalancesByUsername(username) {
    return this.query({
      tableName: this.tableName,
      indexName: UserBalanceIndexUsername.name,
      hashKey: UserBalanceIndexUsername.hashKey,
      hashKeyValue: username
    });
  }
}

module.exports = UserBalance;
```

Make use of the UserBalance table, query with variant dynamodb parameters such as Limit and FilterExpression.

```javascript
const UserBalances = require("./UserBalance");

const UserBalancesTable = new UserBalances();

console.error = jest.fn();

describe("Method that will grab queried items from  a given table", () => {
  test("Grab query by indexName", async () => {
    const result = await UserBalancesTable.queryByUsername({ username: "aleung" });
    expect(result).not.toBeNull();
    expect(result.Items).not.toBeNull();
    expect(result.ScannedCount).toBeDefined();
  });

  test("Using options, Limit the amount of items present(small limit)", async () => {
    const result = await UserBalancesTable.queryByUsername({ username: "aleung" }, { Limit: 2 });
    expect(result).not.toBeNull();
    expect(result.Count).toBe(2);
    expect(result.LastEvaluatedKey).toBeDefined();
  });
  test("Using Projection Expression options, only show certain attributes of an item", async () => {
    const result = await UserBalancesTable.queryByUsername(
      { username: "aleung" },
      { ProjectionExpression: "availableBalance, symbol" }
    );
    expect(result).not.toBeNull();
    const attributes = Object.keys(result.Items[0]);
    expect(attributes).toEqual(expect.arrayContaining(["availableBalance", "symbol"]));
    expect(attributes).not.toEqual(expect.arrayContaining(["pendingTransfer", "totalBalance", "depositAddress"]));
  });
  /**
   * FilterExpression still queries over the whole table and filters from there, not more efficient
   */
  test("Grab info using filterExpression", async () => {
    const result = await UserBalancesTable.queryByUsername(
      { username: "aleung" },
      {
        FilterExpression: "availableBalance > :availableBalance",
        ExpressionAttributeValues: { ":availableBalance": 0 }
      }
    );
    console.log(result);
  });
  /**
   * Consistent Read does not work on secondary index
   */
  test("Use consistent read on items", async () => {
    const result = await UserBalancesTable.query({ hashKeyValue: "aleung_BTC" }, { ConsistentRead: true });
    console.log(result);
  });
  test("Empty Items when a username you search for does not exist", async () => {
    expect.assertions(1);
    const data = await UserBalancesTable.queryByUsername({ username: "qleung" });
    expect(data.Items.length).toBe(0);
  });
});
```

### Sparse Index - Remove attributes

Sparse index is a way to design your secondary indexes so that only a small portion of the items will be stored in the index. It is used for performing more efficient query and scans. [More info here](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html).

When an item doesn't belong to the sparse index anymore, you'll need to remove the attribute that is used as the hashKey/sortKey of an item to take the item out from the index.

To do that, you can simply assign the attribute to `null` in the `update` method, and this library will handle the attribute removal for you.

For example, if we have some `address` items that can be assigned to users, when users signs up, we want to query for an available `address` efficiently, we can design the model as follows

```javascript
class Address extends TableModel {
  constructor() {
    super({
      ...DepositTable,
      indexes: [DepositIndexAvailable] // <-- Sparse Index
    });
  }

  create(item) {
    if (!item.symbol) {
      throw new Error("param symbol is required!");
    }
    return super.create({
      ...item,
      symbolTime: `${item.symbol}_${Date.now()}`,
      status: "available"
    });
  }

  queryOneAvailableAddress(symbol) {
    return super.query(
      {
        indexName: DepositIndexAvailable.name,
        hashKeyValue: "available", // <-- Use the Sparse Index - DepositIndexAvailable
        sortKeyOperator: "begins_with",
        sortKeyValue: symbol
      },
      {
        Limit: 1
      }
    );
  }

  useAddress(address) {
    return super.update({ address }, { status: null }); // <-- remove the element from the Sparse Index
  }
}
```

### Supported dynamodb operators

|          Operators           |
| :--------------------------: |
|              =               |
|              <               |
|              <=              |
|              >               |
|              >=              |
|           between            |
| begins_with (or beginsWith ) |

### Known Issues:

When querying with the options `Select: "COUNT"`, throws an error due to the Items being undefined. This is a rare use case, but one should keep that in mind.

```javascript
const result = await UserBalancesTable.queryByUsername({ username: "aleung" }, { Select: "COUNT" });
```
 -->
