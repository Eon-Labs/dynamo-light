import * as AWS from "aws-sdk";
import Table from "../../src/index";

const tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table");
const tableWithSortKey = new Table("Clevo-Categorized-Sentence-Table");

const composedKey = { categoryName: "查询扣款", fileNameBeginTime: "this is a field from create test" };
const composedItem = { ...composedKey, something: "foo" };
const simpleKey = { fileName: "20170623160058_966_13436475398_601_create" };
const simpleItem = { ...simpleKey, userName: "Chris Lee", somethingElse: "hello world from create test" };
const existingKey = { fileName: "20170624144736_966_13889465270_601" };
const existingItem = {
  fileName: "20170624144736_966_13889465270_601",
  somethingElse: "this is an existing item from create test"
};

beforeAll(() => {
  const dynamoOptions = {
    region: "us-west-2",
    endpoint: "http://localhost:8000"
  };
  const localDynamodb = new AWS.DynamoDB(dynamoOptions);
  const localClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

  Table.replaceDynamoClient(localDynamodb, localClient);
});

test("put an item in partition table", async () => {
  await tableWithPrimaryKey.put(simpleItem);
  const result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).not.toBeNull();
  expect(result.Item.userName).toBe(simpleItem.userName);
  expect(result.Item.somethingElse).toBe(simpleItem.somethingElse);
});

test("put an item in partition and sortkey table", async () => {
  await tableWithSortKey.put(composedItem);
  const result = await tableWithSortKey.get(composedKey);
  expect(result.Item).not.toBeNull();
  expect(result.Item.something).toBe(composedItem.something);
  expect(result.Item.categoryName).toBe(composedItem.categoryName);
});

test("put an item that already exist will replace the item", async () => {
  await tableWithPrimaryKey.put(existingItem);
  const result = await tableWithPrimaryKey.get(existingKey);
  expect(result.Item).not.toBeNull();
  expect(result.Item.categorizeResult).not.toBeDefined();
  expect(result.Item.somethingElse).toBe(existingItem.somethingElse);
});

test("put an item with invalid params will be caught", async () => {
  expect.assertions(2);
  try {
    await tableWithPrimaryKey.put({ fakeKey: "wrong name for hashKey" });
  } catch (e) {
    expect(e).not.toBeNull();
    expect(e.message).toMatch("One of the required keys was not given a value");
  }
});

test("put an item with options", async () => {
  // const result1 = await tableWithPrimaryKey.get(simpleKey.fileName);
  // const result2 = await tableWithPrimaryKey.get(simpleKey);
  // expect(result1.Item).not.toBeNull();
  // expect(result2.Item).not.toBeNull();
  // expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
});
