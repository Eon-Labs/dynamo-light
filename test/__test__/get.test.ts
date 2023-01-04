import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "../../src/index";

let tableWithPrimaryKey;
let tableWithSortKey;
console.error = jest.fn();

const simpleKeyStr = "20170630182315_966_15842646466_601";
const simpleKey = { fileName: simpleKeyStr };
const nonExistKey = { fileName: "not exist" };
const composedKey = { categoryName: "查询扣款", fileNameBeginTime: "20170623160058_966_13436475398_601.wav-16940" };

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

  tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table");
  tableWithSortKey = new Table("Clevo-Categorized-Sentence-Table");
});

test("Get item with shorthand partitionKey string", async () => {
  const result = await tableWithPrimaryKey.get(simpleKeyStr);
  expect(result.Item).not.toBeUndefined();
  expect(result.Item?.fileName).toBe(simpleKey.fileName);
});

test("get item with regular partitionKey", async () => {
  const result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).not.toBeUndefined();
  expect(result.Item?.fileName).toBe(simpleKey.fileName);
});

test("get item with partitionKey and sortKey", async () => {
  const result = await tableWithSortKey.get(composedKey);
  expect(result.Item).not.toBeUndefined();
  expect(result.Item?.categoryName).toBe(composedKey.categoryName);
});

test("get item with non-existing key", async () => {
  const result = await tableWithPrimaryKey.get(nonExistKey);
  expect(result.Item).toBeUndefined();
});

test("get item with options - ConsistentRead", async () => {
  const result = await tableWithPrimaryKey.get(simpleKey, { ConsistentRead: true });
  expect(result.Item).not.toBeUndefined();
});

test("get item with options - ProjectionExpression", async () => {
  const [entireItem, partialItem] = await Promise.all([
    tableWithSortKey.get(composedKey),
    tableWithSortKey.get(composedKey, { ProjectionExpression: "bg, operatorId" }),
  ]);
  expect(Object.keys(entireItem.Item!).length).toBeGreaterThan(Object.keys(partialItem.Item!).length);
  expect(entireItem.Item?.ed).toBeDefined();
  expect(partialItem.Item?.ed).toBeUndefined();
  expect(partialItem.Item?.bg).toBeDefined();
  expect(partialItem.Item?.operatorId).toBeDefined();
  expect(partialItem.Item).toBeDefined();
});

test(`get item with invalid key should return error`, async () => {
  const key = { abc: 123 };
  expect.assertions(1);
  try {
    await tableWithPrimaryKey.get(key);
  } catch (e) {
    expect(e.message).toBe(`Invalid Key: ${JSON.stringify(key)}`);
  }
});
