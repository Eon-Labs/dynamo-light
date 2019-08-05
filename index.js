const AWS = require("aws-sdk");
const getItem = require("./CRUD/get");
const createItem = require("./CRUD/create");
const deleteItem = require("./CRUD/delete");
const updateItem = require("./CRUD/update");
const queryItems = require("./CRUD/query");
const getAllItems = require("./CRUD/getAll");
const transactWrite = require("./CRUD/transactWrite");

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

class Table {
  constructor(name) {
    this.tableName = name;
    this.initialized = false;
  }

  async initTable() {
    const tableInfo = await dynamodb.describeTable({ TableName: this.tableName }).promise();
    console.log("tableInfo", tableInfo);
    this.initialized = true;
    // process.exit();
  }

  /**
   * Check if the key is valid for this table
   * @param {} key
   */
  isValidKey(key) {
    return key[this.hashKey] !== undefined;
  }

  static transactWrite(
    transactions,
    options = {},
    libOptions = { verbose: false, conditions: {} }
  ) {
    const { verbose, conditions } = libOptions;
    return transactWrite({ docClient, transactions, options, verbose, conditions });
  }

  async get(key, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    if (!this.isValidKey(key)) {
      throw new Error(`key is invalid`);
    }

    const { verbose, forTrx } = libOptions;
    return getItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  async create(item, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { verbose, forTrx } = libOptions;
    return createItem({ docClient, tableName: this.tableName, item, options, verbose, forTrx });
  }

  async delete(key, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    if (!this.isValidKey(key)) {
      throw new Error(`Key param contains invalid keyName`);
    }
    const { verbose, forTrx } = libOptions;
    return deleteItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  async update(key, newFields, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Key param contains invalid keyName`);
    }
    const { verbose, forTrx } = libOptions;
    return updateItem({
      docClient,
      tableName: this.tableName,
      key,
      newFields,
      options,
      verbose,
      forTrx
    });
  }

  async query(
    { indexName, hashKeyValue, sortKeyOperator, sortKeyValue },
    options,
    libOptions = { verbose: false, pagination: true }
  ) {
    if (!this.initialized) await this.initTable();

    const index = this.indexMap.get(indexName);
    if (indexName && !index) {
      throw new Error(`Index ${indexName} doesn't belong to table ${this.tableName}`);
    }

    const hashKey = index ? index.hashKey : this.hashKey;
    let sortKey;
    if (sortKeyValue) {
      sortKey = index ? index.sortKey : this.sortKey;
    }

    const { verbose, pagination } = libOptions;
    return queryItems({
      docClient,
      tableName: this.tableName,
      indexName,
      hashKey,
      hashKeyValue,
      sortKey,
      sortKeyOperator,
      sortKeyValue,
      options,
      pagination,
      verbose
    });
  }

  async getAll(param = {}, options, libOptions = { verbose: false, pagination: true }) {
    if (!this.initialized) await this.initTable();
    const { indexName } = param;
    const { verbose, pagination } = libOptions;
    return getAllItems({
      docClient,
      tableName: this.tableName,
      indexName,
      options,
      pagination,
      verbose
    });
  }
}

module.exports = Table;
