import * as AWS from "aws-sdk";
import { Table } from "../../src/index";

const tableWithSmallData = new Table("Clevo-Processed-Speech-Table");
const tableWithIndexes = new Table("Clevo-Raw-Speech-Table");
console.error = jest.fn();

beforeAll(() => {
  const dynamoOptions = {
    apiVersion: '2012-08-10',
    region: "us-west-2",
    endpoint: "http://localhost:8000",
    accessKeyId: "test",
    secretAccessKey: "test"
  };
  const localDynamodb = new AWS.DynamoDB(dynamoOptions);
  const localClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

  Table.replaceDynamoClient(localDynamodb, localClient);
});

test("Query table with partitionKey", async () => {
  const result = await tableWithSmallData.query({ partitionKeyValue: "20170624201449_966_15142029630_601" });
  const result2 = await tableWithSmallData.query({ fileName: "20170624201449_966_15142029630_601" });
  expect(result.Items.length === 1).toBe(true);
  expect(JSON.stringify(result) === JSON.stringify(result2)).toBe(true);
});

test("Query table in index with pk and sk", async () => {
  const result = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    partitionKeyValue: "RunHua Group",
    sortKeyValue: 1504243566
  });
  expect(result.Items.length === 1).toBe(true);

  const result2 = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group",
    createdAt: 1504243566
  });
  expect(result.Items.length === 1).toBe(true);
  expect(JSON.stringify(result)).toEqual(JSON.stringify(result2));
});

test("Query table in index with partitionKey for multiple items", async () => {
  const result = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group"
  });
  expect(result.Items.length > 1).toBe(true);
});

test("Query table in index with partitionKey, sortKey and sortKeyOperator", async () => {
  const result = await tableWithIndexes.query({
    indexName: "organizationName-createdAt-index",
    organizationName: "RunHua Group",
    sortKeyOperator: ">=",
    createdAt: 1504293566
  });
  expect(result.Items.length > 1).toBe(true);
});

// TODO: add pagination
// TODO: add other options such as Limit, ProjectExpression, etc
