import * as AWS from "aws-sdk";
import { Table } from "../../src/index";

const tableWithSmallData = new Table("Clevo-Processed-Speech-Table");
const tableWithMediumData = new Table("Clevo-Raw-Speech-Table");
console.error = jest.fn();

beforeAll(() => {
  const dynamoOptions = {
    region: "us-west-2",
    endpoint: "http://localhost:8000"
  };
  const localDynamodb = new AWS.DynamoDB(dynamoOptions);
  const localClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

  Table.replaceDynamoClient(localDynamodb, localClient);
});

test("scan generally with no input", async () => {
  const result = await tableWithSmallData.scan();
  expect(result.Items).not.toBeNull();
  expect(result.Items.length > 0).toBe(true);
});

test("scan with pagination to be false", async () => {
  const result1 = await tableWithMediumData.scan({}, { pagination: true });
  const result2 = await tableWithMediumData.scan({}, { pagination: false });
  expect(result1.Items.length > 0).toBe(true);
  expect(result2.Items.length > 0).toBe(true);
  expect(result2.Items.length > result1.Items.length).toBe(true);
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
    Limit: 5
  };
  const { Items: fetchedItems } = await tableWithMediumData.scan({}, options);
  expect(fetchedItems.length).toBe(options.Limit);
  expect(fetchedItems[0][options.AttributesToGet[0]]).toBeDefined();
  expect(fetchedItems[0].organizationName).not.toBeDefined();
});
