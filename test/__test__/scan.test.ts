import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Table } from "../../src/index";

let tableWithSmallData;
let tableWithMediumData;
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
