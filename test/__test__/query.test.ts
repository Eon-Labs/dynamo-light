import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "../../src/index";

let tableWithSmallData;
let tableWithIndexes;
console.error = jest.fn();

beforeAll(() => {
  const dynamoOptions: DynamoDBClientConfig = {
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
    },
  };
  const localDbClient = new DynamoDBClient(dynamoOptions);
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

// TODO: add pagination
// TODO: add other options such as Limit, ProjectExpression, etc
