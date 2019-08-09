import Table from "../../src/index";

const tableWithPrimaryKey = new Table("Clevo-Processed-Speech-Table");
// const tableWithSortKey = new Transaction();
console.error = jest.fn();

const simpleKey = { fileName: "20170623160058_966_13436475398_601_8" };
const simpleItem = { ...simpleKey, categorizedSpeechTopic: "Test data: hello world" };

test("Can delete using partition key", async () => {
  await tableWithPrimaryKey.put(simpleItem);
  let result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).not.toBeNull();

  await tableWithPrimaryKey.delete(simpleKey);
  result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).toBeNull();
});

test("Can delete using partition key string", async () => {
  await tableWithPrimaryKey.put(simpleItem);
  let result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).not.toBeNull();

  await tableWithPrimaryKey.delete(simpleKey.fileName);
  result = await tableWithPrimaryKey.get(simpleKey);
  expect(result.Item).toBeNull();
});
