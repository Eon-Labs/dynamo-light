import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "../../src/index";

let tableWithSmallData;
let tableWithIndexes;
console.error = jest.fn();

const defaultRegion = "us-west-2";
const dynamoDBClientConfig: DynamoDBClientConfig = {
  region: defaultRegion,
  endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
};

beforeAll(() => {
  const localDbClient = new DynamoDBClient(dynamoDBClientConfig);
  const localDocClient = DynamoDBDocumentClient.from(localDbClient);

  Table.replaceDynamoClient(localDbClient, localDocClient);

  tableWithSmallData = new Table("Clevo-Processed-Speech-Table");
  tableWithIndexes = new Table("Clevo-Raw-Speech-Table");
});

test("Query table with partitionKey", async () => {
  const result = await tableWithSmallData.query({ partitionKeyValue: "20170624201449_966_15142029630_601" });
  const result2 = await tableWithSmallData.query({ fileName: "20170624201449_966_15142029630_601" });
  expect(result.Items.length === 1).toBe(true);
  expect(JSON.stringify(result.Items) === JSON.stringify(result2.Items)).toBe(true);
});

test("Query table in index with pk and sk", async () => {
  const result = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    partitionKeyValue: "RunHua Group",
    sortKeyValue: 1504243566,
  });
  expect(result.Items.length === 1).toBe(true);

  const result2 = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group",
    createdAt: 1504243566,
  });
  expect(result.Items.length === 1).toBe(true);
  expect(JSON.stringify(result.Items)).toEqual(JSON.stringify(result2.Items));
});

test("Query table in index with partitionKey for multiple items", async () => {
  const result = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group",
  });
  expect(result.Items.length > 1).toBe(true);
});

test("Query table in index with partitionKey, sortKey and sortKeyOperator", async () => {
  const result = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group",
    sortKeyOperator: ">=",
    createdAt: 1504293566,
  });
  expect(result.Items.length > 1).toBe(true);
});

test("Query table in index with partitionKey, sortKey and sortKeyOperator BETWEEN", async () => {
  // fetch all items to be used later in the test
  const items = (
    await tableWithIndexes.scan({
      indexName: "organizationName-createdAt-index",
      organizationName: "RunHua Group",
    })
  ).Items;
  const minCreatedAt = Math.min(...items.map((item) => item.createdAt));
  const maxCreatedAt = Math.max(...items.map((item) => item.createdAt));
  const totalItemsNum = items.length;
  // verify if the table has the correct data statistics
  expect(minCreatedAt).toBe(1504206475);
  expect(maxCreatedAt).toBe(1504291588);
  expect(totalItemsNum).toBe(1190);

  // case1: between range is large, contains all items
  const case1 = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group",
    sortKeyOperator: "BETWEEN",
    createdAt: [minCreatedAt, maxCreatedAt],
  });
  const createdAtArr = case1.Items.map((item) => item.createdAt);
  const min = Math.min(...createdAtArr);
  const max = Math.max(...createdAtArr);
  expect(min).toBe(minCreatedAt);
  expect(max).toBe(maxCreatedAt);
  expect(case1.Items.length).toBe(totalItemsNum);

  // case2: between starts from the middle of data range
  const start = minCreatedAt + (maxCreatedAt - minCreatedAt) / 2; // (1504291588 - 1504206475) / 2
  const end = maxCreatedAt + 1000; // 1504291588 + 1000
  const case2 = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group",
    sortKeyOperator: "BETWEEN",
    createdAt: [start, end],
  });
  const createdAtArr2 = case2.Items.map((item) => item.createdAt);
  const min2 = Math.min(...createdAtArr2);
  const max2 = Math.max(...createdAtArr2);
  expect(min2).toBeGreaterThanOrEqual(start);
  expect(max2).toBeLessThan(end);
  expect(case2.Items.length).toBeLessThan(totalItemsNum);
});

test("Query table with default region", async () => {
  const docClient = tableWithSmallData.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithSmallData.query({ partitionKeyValue: "20170624201449_966_15142029630_601" });

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(docClient.config.region()).resolves.toBe(defaultRegion);
});

test("Query table with override region", async () => {
  const anotherRegion = "ap-northeast-1";
  const tableWithAnotherRegion = new Table("Clevo-Processed-Speech-Table", {
    ...dynamoDBClientConfig,
    region: anotherRegion,
  });
  const docClient = tableWithAnotherRegion.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithAnotherRegion.query({ partitionKeyValue: "20170624201449_966_15142029630_601" });

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(docClient.config.region()).resolves.not.toBe(defaultRegion);
  await expect(docClient.config.region()).resolves.toBe(anotherRegion);
});

// TODO: add pagination
// TODO: add other options such as Limit, ProjectExpression, etc
