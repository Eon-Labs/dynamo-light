const getItem = require("./CRUD/get");
const createItem = require("./CRUD/create");
const deleteItem = require("./CRUD/delete");
const updateItem = require("./CRUD/update");
const queryItems = require("./CRUD/query");
const getAllItems = require("./CRUD/getAll");
const transactWrite = require("./CRUD/transactWrite");

class Table {
  constructor({ name, indexes = [], hashKey, sortKey }) {
    this.tableName = name;
    this.hashKey = hashKey;
    this.sortKey = sortKey;
    this.indexMap = new Map();
    indexes.forEach(index => {
      if (!index.name || !index.hashKey) {
        throw new Error(
          `Init Failed: indexes array expect item in format {name, hashKey, [sortKey]}`
        );
      }
      this.indexMap.set(index.name, index);
    });
  }

  /**
   * Check if the key is valid for this table
   * @param {} key
   */
  isValidKey(key) {
    return key[this.hashKey] !== undefined;
    // Object.keys(key).forEach(keyName => {
    //   if (keyName !== this.hashKey && keyName !== this.sortKey) {
    //     isValid = false;
    //   }
    // });
  }

  static transactWrite(
    transactions,
    options = {},
    libOptions = { verbose: false, conditions: {} }
  ) {
    const { verbose, conditions } = libOptions;
    return transactWrite({ transactions, options, verbose, conditions });
  }

  get(key, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.isValidKey(key)) {
      throw new Error(`key is invalid`);
    }

    const { verbose, forTrx } = libOptions;
    return getItem({ tableName: this.tableName, key, options, verbose, forTrx });
  }

  create(item, options, libOptions = { verbose: false, forTrx: false }) {
    const { verbose, forTrx } = libOptions;
    return createItem({ tableName: this.tableName, item, options, verbose, forTrx });
  }

  delete(key, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.isValidKey(key)) {
      throw new Error(`Key param contains invalid keyName`);
    }
    const { verbose, forTrx } = libOptions;
    return deleteItem({ tableName: this.tableName, key, options, verbose, forTrx });
  }

  update(key, newFields, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.isValidKey(key)) {
      throw new Error(`Key param contains invalid keyName`);
    }
    const { verbose, forTrx } = libOptions;
    return updateItem({ tableName: this.tableName, key, newFields, options, verbose, forTrx });
  }

  query(
    { indexName, hashKeyValue, sortKeyOperator, sortKeyValue },
    options,
    libOptions = { verbose: false, pagination: true }
  ) {
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

  getAll(param = {}, options, libOptions = { verbose: false, pagination: true }) {
    const { indexName } = param;
    const { verbose, pagination } = libOptions;
    return getAllItems({ tableName: this.tableName, indexName, options, pagination, verbose });
  }
}

module.exports = Table;
