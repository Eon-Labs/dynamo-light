import Table from "../../index";

const tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table");
// const tableWithSortKey = new Transaction();
console.error = jest.fn();

const simpleKey = { fileName: "20170623160058_966_13436475398_601_9" };
const nonExistKey = { fileName: "not exist" };
const simpleItem = { ...simpleKey, categorizedSpeechTopic: "Test data: hello world" };

beforeAll(async () => {
  await tableWithPrimaryKey.put(simpleItem);
});

test("Grabs proper item given the right key", async () => {
  const result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).not.toBeNull();
  expect(result.Item.fileName).toBe(simpleKey.fileName);
});

test("get non existing key should return {Item: null}", async () => {
  const result = await tableWithPrimaryKey.get(nonExistKey);
  expect(result.Item).toBeNull();
});

test("Grab key with ConsistentRead set to true", async () => {
  await tableWithPrimaryKey.update(simpleKey, { username: "wooj" });
  const result = await tableWithPrimaryKey.get(simpleKey, { ConsistentRead: true });
  expect(result.Item).not.toBeNull();
});

test("Grab Key but only specific attribute", async () => {
  const key = simpleKey;
  await tableWithPrimaryKey.update(key, { username: "wooj" });
  const result = await tableWithPrimaryKey.get(key, { ProjectionExpression: "username" });
  expect(result.Item.key).toBeUndefined();
  expect(result.Item.username).toBe("wooj");
});
//   test("Grab Key with two options", async () => {
//     const key = { key: "123" };
//     const options = { ReturnConsumedCapacity: "INDEXES", ProjectionExpression: "username" };
//     const result = await tableWithPrimaryKey.get(key, options);
//     expect(result.ConsumedCapacity).toBeTruthy();
//     expect(result.ConsumedCapacity.CapacityUnits).toBeTruthy();
//     expect(result.Item.key).toBeUndefined();
//     expect(result.Item.username).toBe("wooj");
//   });

//   // test("Grab item with both primary and sort key", async () => {
//   //   const key = { username: "wooj", itemDateTime: 20190201 };
//   //   const result = await tableWithSortKey.get(key);
//   //   expect(result).not.toBeNull();
//   //   expect(result.Item.username).toBe("wooj");
//   //   expect(result.Item.isCompleted).toEqual(true);
//   // });

//   test(`If no key is provided returns "key is undefined!" message.`, async () => {
//     const key = "";
//     expect.assertions(1);
//     try {
//       await tableWithPrimaryKey.get(key);
//     } catch (e) {
//       expect(e.message).toBe("key is invalid");
//     }
//   });
afterAll(async () => {
  await tableWithPrimaryKey.delete(simpleKey);
});
