import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import Big from "big.js";
import { Table } from "../../src/index";

let tableWithPrimaryKey: Table;
let tableWithSortKey: Table;

const simpleKeyStr = "20170630180016_966_13610827935_601";
const simpleKey = { fileName: simpleKeyStr };
const nonExistKey = { fileName: "not exist for update" };
const composedKey = { categoryName: "查询扣款", fileNameBeginTime: "20170623160058_966_13436475398_601.wav-4330" };

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

test("update a existing field with shorthand key", async () => {
  const result = await tableWithPrimaryKey.update(simpleKeyStr, { organizationName: "Test group" });
  expect(result.Attributes).not.toBeUndefined();
  expect(result.Attributes?.organizationName).toBe("Test group");
});

test("update a existing field", async () => {
  const result = await tableWithPrimaryKey.update(simpleKey, { organizationName: "Test group 2" });
  expect(result.Attributes).not.toBeUndefined();
  expect(result.Attributes?.organizationName).toBe("Test group 2");
});

test("update a non-existing field", async () => {
  const nonExistingField = "This is new for update!";
  const result = await tableWithPrimaryKey.update(simpleKeyStr, { nonExistingField });
  expect(result.Attributes).not.toBeUndefined();
  expect(result.Attributes?.nonExistingField).toBe(nonExistingField);
});

test("update a non-existing item", async () => {
  try {
    expect.assertions(1);
    await tableWithPrimaryKey.update("non-exist-key", { nonExistingField: "This is new!" });
  } catch (error: any) {
    expect(error.name).toBe("ConditionalCheckFailedException");
  }
});

test("simple update on an item with partition and sort key", async () => {
  const newFields = {
    address: 2345,
  };
  const data = await tableWithSortKey.update(composedKey, newFields);
  expect(data.Attributes?.address).toBe(2345);
});

test("using atomic counter for float value", async () => {
  const newFields = {
    "+totalEmoScore": 0.5,
    "+totalToneScore": -1,
  };
  const { Item: initialItem } = await tableWithPrimaryKey.get(simpleKey);

  const promises: any = [];
  const concurrentCount = 10;
  for (let i = 0; i < concurrentCount; i += 1) {
    promises.push(tableWithPrimaryKey.update(simpleKey, newFields));
  }

  await Promise.all(promises);
  const { Item: updatedItem } = await tableWithPrimaryKey.get(simpleKey);

  const resultTotalToneScore = new Big(updatedItem?.totalToneScore).toPrecision(12);
  const expectTotalToneScore = new Big(initialItem?.totalToneScore)
    .plus(new Big(concurrentCount).times(new Big(newFields["+totalToneScore"])))
    .toPrecision(12);

  const resultTotalEmoScore = new Big(updatedItem?.totalEmoScore).toPrecision(12);
  const expectTotalEmoScore = new Big(initialItem?.totalEmoScore)
    .plus(new Big(concurrentCount).times(new Big(newFields["+totalEmoScore"])))
    .toPrecision(12);

  expect(resultTotalToneScore).toBe(expectTotalToneScore);
  expect(resultTotalEmoScore).toBe(expectTotalEmoScore);
});

test("using atomic counter for float value guarded by condition expression - updated field must be >= 0", async () => {
  const newFields = {
    "+silenceDuration": -3000,
  };

  const { Item: initialItem } = await tableWithPrimaryKey.get(simpleKey);
  try {
    const silenceDurationLimit = newFields["+silenceDuration"] < 0 ? -newFields["+silenceDuration"] : -Infinity;
    const options = {
      ConditionExpression: "silenceDuration >= :silenceDurationLimit",
      ExpressionAttributeValues: {
        ":silenceDurationLimit": silenceDurationLimit,
      },
    };

    const promises: any = [];
    const concurrentCount = 10;
    for (let i = 0; i < concurrentCount; i += 1) {
      promises.push(tableWithPrimaryKey.update(simpleKey, newFields, options));
    }
    await Promise.all(promises);
  } catch (error) {
    const { Item: updatedItem } = await tableWithPrimaryKey.get(simpleKey);

    const silenceDuration = new Big(initialItem?.silenceDuration);
    const divider = new Big(Math.abs(newFields["+silenceDuration"]));
    const expects = silenceDuration.mod(divider);
    const result = new Big(updatedItem?.silenceDuration);
    expect(result).toEqual(expects);
    expect(updatedItem?.silenceDuration).toBeGreaterThanOrEqual(0);
  }
});

test("change RETURN VALUES to see if it causes error", async () => {
  const newFields = {
    operatorId: "a new change",
  };
  const options = {
    ReturnValues: "ALL_OLD",
  };
  const data = await tableWithSortKey.update(composedKey, newFields, options);
  expect(data.Attributes?.operatorId).not.toMatch(newFields.operatorId);
});

test("enterng an invalid key with option createIfNotExist set to true will create a new item", async () => {
  const newFields = {
    organizationName: "test group",
  };
  const options = {
    createIfNotExist: true,
  };
  const result = await tableWithPrimaryKey.update(nonExistKey, newFields, options);
  expect(result.Attributes).not.toBeUndefined();
  expect(result.Attributes?.organizationName).toBe(newFields.organizationName);
}, 60000);

test("entering an invalid key with option createIfNotExist set to default(false) will cause conditional request error(sortKey)", async () => {
  expect.assertions(2);
  const anotherNonExistKey = { fileName: "non exist key 2 for update" };
  try {
    const newFields = {
      address: "2456",
    };
    await tableWithPrimaryKey.update(anotherNonExistKey, newFields);
  } catch (e: any) {
    expect(e.name).toBe("ConditionalCheckFailedException");
    expect(e.message).toMatch("The conditional request failed");
  }
}, 60000);

test("update key, using condition expression", async () => {
  const newFields = {
    operatorId: "helloWorld from update test",
  };
  const options = {
    ConditionExpression: "attribute_exists(operatorId)",
  };
  const results = await tableWithSortKey.update(composedKey, newFields, options);
  expect(results.Attributes).not.toBeUndefined();
  expect(results.Attributes?.operatorId).toBe(newFields.operatorId);
});

test("if condtion expression is not met, throw condtion exception error", async () => {
  expect.assertions(2);
  try {
    const newFields = {
      operatorId: "helloWorld",
    };
    const options = {
      ConditionExpression: "attribute_not_exists(operatorId)",
    };
    await tableWithSortKey.update(composedKey, newFields, options);
  } catch (e: any) {
    expect(e.$response.statusCode).toBe(400);
    expect(e.message).toMatch("The conditional request failed");
  }
});

test("update table with default region", async () => {
  const docClient = tableWithPrimaryKey.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithPrimaryKey.update(simpleKeyStr, { organizationName: "Test group" });

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(docClient.config.region()).resolves.toBe(defaultRegion);
});

test("update table with override region", async () => {
  const anotherRegion = "ap-northeast-1";
  const tableWithAnotherRegion = new Table("Clevo-Processed-Speech-Table", {
    ...dynamoDBClientConfig,
    region: anotherRegion,
  });
  const docClient = tableWithAnotherRegion.docClient;
  const spyDocClientCallDynamoDb = jest.spyOn(docClient, "send");

  await tableWithAnotherRegion.update(simpleKeyStr, { organizationName: "Test group" });

  expect(spyDocClientCallDynamoDb).toHaveBeenCalledTimes(1);
  await expect(docClient.config.region()).resolves.not.toBe(defaultRegion);
  await expect(docClient.config.region()).resolves.toBe(anotherRegion);
});
