import * as AWS from "aws-sdk";
import { Table } from "../../src/index";

const tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table");
const tableWithSortKey = new Table("Clevo-Categorized-Sentence-Table");

const composedKey = { categoryName: "其他", fileNameBeginTime: "20170623152601_966_15876378734_601.wav-27010" };
const simpleKeyStr = "20170628135402_966_15940025466_601";
const simpleKey = { fileName: simpleKeyStr };
const nonExistingKey = { fileName: "abcd1234" };

beforeAll(() => {
  const dynamoOptions = {
    region: "us-west-2",
    endpoint: "http://localhost:8000"
  };
  const localDynamodb = new AWS.DynamoDB(dynamoOptions);
  const localClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

  Table.replaceDynamoClient(localDynamodb, localClient);
});

test("delete an item using shorthand partition key", async () => {
  const simpleKeyStr2 = "20170624150604_966_18732298697_601";
  expect((await tableWithPrimaryKey.get(simpleKeyStr2)).Item).not.toBeNull();

  await tableWithPrimaryKey.delete(simpleKeyStr2);
  const result = await tableWithPrimaryKey.get(simpleKeyStr2);
  expect(result.Item).toBeNull();
});

test("delete an item using partition key", async () => {
  expect((await tableWithPrimaryKey.get(simpleKey)).Item).not.toBeNull();

  await tableWithPrimaryKey.delete(simpleKey);
  const result = await tableWithPrimaryKey.get(simpleKeyStr);
  expect(result.Item).toBeNull();
});

test("delete an item using composed key", async () => {
  expect((await tableWithSortKey.get(composedKey)).Item).not.toBeNull();

  await tableWithSortKey.delete(composedKey);
  const result = await tableWithSortKey.get(composedKey);
  expect(result.Item).toBeNull();
});

test("delete an item that does not exist", async () => {
  expect.assertions(1);
  try {
    await tableWithPrimaryKey.delete(nonExistingKey);
  } catch (error) {
    expect(error).not.toBeNull();
  }
});

test("delete an item with options", async () => {
  // try {
  //   await tableWithPrimaryKey.delete(nonExistingKey);
  // } catch (error) {
  //   expect(error).not.toBeNull();
  // }
});
