import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "../../src/index";

let tableWithPrimaryKey;
let tableWithSortKey;

const composedKey = { categoryName: "查询扣款", fileNameBeginTime: "this is a field from create test" };
const composedItem = { ...composedKey, something: "foo" };
const simpleKey = { fileName: "20170623160058_966_13436475398_601_create" };
const simpleItem = { ...simpleKey, userName: "Chris Lee", somethingElse: "hello world from create test" };
const simpleItemWithUndefined = { ...simpleItem, anotherField: undefined };
const existingKey = { fileName: "20170624144736_966_13889465270_601" };
const existingItem = {
  fileName: "20170624144736_966_13889465270_601",
  somethingElse: "this is an existing item from create test",
};

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

  tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table", dynamoDBClientConfig);
  tableWithSortKey = new Table("Clevo-Categorized-Sentence-Table", dynamoDBClientConfig);
});

test("put an item in partition table", async () => {
  await tableWithPrimaryKey.put(simpleItem);
  const result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).not.toBeUndefined();
  expect(result.Item?.userName).toBe(simpleItem.userName);
  expect(result.Item?.somethingElse).toBe(simpleItem.somethingElse);
});

test("put an item in partition and sortkey table", async () => {
  await tableWithSortKey.put(composedItem);
  const result = await tableWithSortKey.get(composedKey);
  expect(result.Item).not.toBeUndefined();
  expect(result.Item?.something).toBe(composedItem.something);
  expect(result.Item?.categoryName).toBe(composedItem.categoryName);
});

test("put an item that already exist will replace the item", async () => {
  await tableWithPrimaryKey.put(existingItem);
  const result = await tableWithPrimaryKey.get(existingKey);
  expect(result.Item).not.toBeUndefined();
  expect(result.Item?.categorizeResult).not.toBeDefined();
  expect(result.Item?.somethingElse).toBe(existingItem.somethingElse);
});

test("put an item with invalid params will be caught", async () => {
  expect.assertions(2);
  try {
    await tableWithPrimaryKey.put({ fakeKey: "wrong name for hashKey" });
  } catch (e: any) {
    expect(e).not.toBeUndefined();
    expect(e.message).toMatch("One or more parameter values were invalid: Missing the key fileName in the item");
  }
});

test("put an item with options", async () => {
  // const result1 = await tableWithPrimaryKey.get(simpleKey.fileName);
  // const result2 = await tableWithPrimaryKey.get(simpleKey);
  // expect(result1.Item).not.toBeUndefined();
  // expect(result2.Item).not.toBeUndefined();
  // expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
});

test("put with default region", async () => {
  const docClient = tableWithPrimaryKey.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithPrimaryKey.put(simpleItem);

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(docClient.config.region()).resolves.toBe(defaultRegion);
});

test("put with override region", async () => {
  const anotherRegion = "ap-northeast-1";
  const tableWithAnotherRegion = new Table("Clevo-Processed-Speech-Table", {
    ...dynamoDBClientConfig,
    region: anotherRegion,
  });
  const docClient = tableWithAnotherRegion.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithAnotherRegion.put(simpleItem);

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(docClient.config.region()).resolves.not.toBe(defaultRegion);
  await expect(docClient.config.region()).resolves.toBe(anotherRegion);
});

test("put with undefined fields", async () => {
  // if the DynamoDB document client is not configured properly, an error will be thrown
  // when trying to put an undefined field in the DynamoDB
  await expect(tableWithPrimaryKey.put(simpleItemWithUndefined)).resolves.not.toThrow();
  const result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).not.toBeUndefined();
  expect(result.Item?.userName).toBe(simpleItem.userName);
  expect(result.Item?.somethingElse).toBe(simpleItem.somethingElse);
  expect(result.Item?.anotherField).toBeUndefined();
});
