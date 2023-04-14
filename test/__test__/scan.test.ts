import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "../../src/index";

let tableWithSmallData: Table;
let tableWithMediumData: Table;
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
  tableWithMediumData = new Table("Clevo-Raw-Speech-Table");
});

test("scan generally with no input", async () => {
  const result = await tableWithSmallData.scan();
  expect(result.Items).not.toBeUndefined();
  expect(result.Items!.length > 0).toBe(true);
});

test("scan with pagination to be false", async () => {
  const result1 = await tableWithMediumData.scan({}, { pagination: true });
  const result2 = await tableWithMediumData.scan({}, { pagination: false });
  expect(result1.Items!.length > 0).toBe(true);
  expect(result2.Items!.length > 0).toBe(true);
  expect(result2.Items!.length > result1.Items!.length).toBe(true);
});

test("scan with options: FilterExpression", async () => {
  // const result1 = await tableWithMediumData.scan({}, {}, { pagination: true });
  // const result2 = await tableWithMediumData.scan({}, {}, { pagination: false });
  // expect(result1.Items.length > 0).toBe(true);
  // expect(result2.Items.length > 0).toBe(true);
  // expect(result2.Items.length > result1.Items.length).toBe(true);
});

test("scan with options: AttributesToGet and Limit", async () => {
  const options = {
    AttributesToGet: ["fileExtension", "transcribedAt"],
    Select: "SPECIFIC_ATTRIBUTES",
    Limit: 5,
  };
  const { Items: fetchedItems } = await tableWithMediumData.scan({}, options);
  expect(fetchedItems!.length).toBe(options.Limit);
  expect(fetchedItems![0][options.AttributesToGet[0]]).toBeDefined();
  expect(fetchedItems![0].organizationName).not.toBeDefined();
});

test("scan with default region", async () => {
  const docClient = tableWithSmallData.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithSmallData.scan();

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(docClient.config.region()).resolves.toBe(defaultRegion);
});

test("scan with override region", async () => {
  const anotherRegion = "ap-northeast-1";
  const tableWithAnotherRegion = new Table("Clevo-Processed-Speech-Table", {
    ...dynamoDBClientConfig,
    region: anotherRegion,
  });
  const docClient = tableWithAnotherRegion.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithAnotherRegion.scan();

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(tableWithAnotherRegion.docClient.config.region()).resolves.not.toBe(defaultRegion);
  await expect(tableWithAnotherRegion.docClient.config.region()).resolves.toBe(anotherRegion);
});
