import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "../../src/index";

let tableWithPrimaryKey;
let tableWithSortKey;

const composedKey = { categoryName: "其他", fileNameBeginTime: "20170623152601_966_15876378734_601.wav-27010" };
const simpleKeyStr = "20170628135402_966_15940025466_601";
const simpleKey = { fileName: simpleKeyStr };
const nonExistingKey = { fileName: "abcd1234" };

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

  tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table");
  tableWithSortKey = new Table("Clevo-Categorized-Sentence-Table");
});

test("delete an item using shorthand partition key", async () => {
  const simpleKeyStr2 = "20170624150604_966_18732298697_601";
  expect((await tableWithPrimaryKey.get(simpleKeyStr2)).Item).not.toBeUndefined();

  await tableWithPrimaryKey.delete(simpleKeyStr2);
  const result = await tableWithPrimaryKey.get(simpleKeyStr2);
  expect(result.Item).toBeUndefined();
});

test("delete an item using partition key", async () => {
  expect((await tableWithPrimaryKey.get(simpleKey)).Item).not.toBeUndefined();

  await tableWithPrimaryKey.delete(simpleKey);
  const result = await tableWithPrimaryKey.get(simpleKeyStr);
  expect(result.Item).toBeUndefined();
});

test("delete an item using composed key", async () => {
  expect((await tableWithSortKey.get(composedKey)).Item).not.toBeUndefined();

  await tableWithSortKey.delete(composedKey);
  const result = await tableWithSortKey.get(composedKey);
  expect(result.Item).toBeUndefined();
});

test("delete an item that does not exist", async () => {
  expect.assertions(1);
  try {
    await tableWithPrimaryKey.delete(nonExistingKey);
  } catch (error) {
    expect(error).not.toBeUndefined();
  }
});

test("delete an item with options", async () => {
  // try {
  //   await tableWithPrimaryKey.delete(nonExistingKey);
  // } catch (error) {
  //   expect(error).not.toBeUndefined();
  // }
});

test("delete with default region", async () => {
  const docClient = tableWithPrimaryKey.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  try {
    await tableWithPrimaryKey.delete("non-exist-key");
  } catch (error) {
    console.log("error is expected for non-exist-key");
  } finally {
    expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
    await expect(docClient.config.region()).resolves.toBe(defaultRegion);
  }
});

test("delete with override region", async () => {
  const anotherRegion = "ap-northeast-1";
  const tableWithAnotherRegion = new Table("Clevo-Processed-Speech-Table", {
    ...dynamoDBClientConfig,
    region: anotherRegion,
  });
  const docClient = tableWithAnotherRegion.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  try {
    await tableWithAnotherRegion.delete("non-exist-key");
  } catch (error) {
    console.log("error is expected for non-exist-key");
  } finally {
    expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
    await expect(docClient.config.region()).resolves.not.toBe(defaultRegion);
    await expect(docClient.config.region()).resolves.toBe(anotherRegion);
  }
});
