import AWS from "aws-sdk";
import createItem from "./CRUD/create";
import deleteItem from "./CRUD/delete";
import getItem from "./CRUD/get";
import getAllItems from "./CRUD/getAll";
import queryItems from "./CRUD/query";
import transactWrite from "./CRUD/transactWrite";
import updateItem from "./CRUD/update";

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

interface IIndex {
  name: string;
  partitionKey: string;
  sortKey: string;
}

class Table {
  public static transactWrite(transactions, options = {}, libOptions = { verbose: false, conditions: {} }) {
    const { verbose, conditions } = libOptions;
    return transactWrite({ docClient, transactions, options, verbose });
  }

  private tableName: string;
  private initialized: boolean;
  private partitionKey: string | undefined;
  private sortKey: string | undefined;
  private indexMap: Map<string, IIndex>;

  constructor(name: string) {
    this.tableName = name;
    this.initialized = false;
    this.partitionKey = undefined;
    this.sortKey = undefined;
    this.indexMap = new Map();
  }

  public async initTable() {
    const tableInfo: any = await dynamodb.describeTable({ TableName: this.tableName }).promise();
    console.log("tableInfo", tableInfo);
    this.initialized = true;
    /**
     * Set partitionKey and sortKey
     */
    const { KeySchema, GlobalSecondaryIndexes } = tableInfo;
    this.addKeysToObj(KeySchema, this);

    /**
     * Set indexes
     */
    for (const indexRecord of GlobalSecondaryIndexes) {
      const index: IIndex = {
        name: "UsernameIndex",
        partitionKey: undefined,
        sortKey: undefined
      };
      this.addKeysToObj(indexRecord.KeySchema, index);
      this.indexMap.set(indexRecord.IndexName, index);
    }
  }

  /**
   * Check if the key is valid for this table
   * @param {} key
   */
  public isValidKey(key) {
    return key[this.partitionKey] !== undefined;
  }

  public async get(key: string | , options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    if (!this.isValidKey(key)) {
      throw new Error(`key is invalid`);
    }

    const { verbose, forTrx } = libOptions;
    return getItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async create(item, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { verbose, forTrx } = libOptions;
    return createItem({ docClient, tableName: this.tableName, item, options, verbose, forTrx });
  }

  public async delete(key, options, libOptions = { verbose: false, forTrx: false }) {
    if (!this.initialized) {
      await this.initTable();
    }
    if (!this.isValidKey(key)) {
      throw new Error(`Key param contains invalid keyName`);
    }
    const { verbose, forTrx } = libOptions;
    return deleteItem({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async update(key, newFields, options, libOptions = { verbose: false, forTrx: false }) {
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

  public async query(
    { indexName, partitionKeyValue, sortKeyOperator, sortKeyValue },
    options,
    libOptions = { verbose: false, pagination: true }
  ) {
    if (!this.initialized) {
      await this.initTable();
    }

    const index = this.indexMap.get(indexName);
    if (indexName && !index) {
      throw new Error(`Index ${indexName} doesn't belong to table ${this.tableName}`);
    }

    const partitionKey = index ? index.partitionKey : this.partitionKey;
    let sortKey;
    if (sortKeyValue) {
      sortKey = index ? index.sortKey : this.sortKey;
    }

    const { verbose, pagination } = libOptions;
    return queryItems({
      docClient,
      tableName: this.tableName,
      indexName,
      partitionKey,
      partitionKeyValue,
      sortKey,
      sortKeyOperator,
      sortKeyValue,
      options,
      pagination,
      verbose
    });
  }

  public async getAll(param = {}, options, libOptions = { verbose: false, pagination: true }) {
    if (!this.initialized) {
      await this.initTable();
    }
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

  private addKeysToObj(KeySchema: any, obj: any) {
    for (const { AttributeName, KeyType } of KeySchema) {
      if (KeyType === "HASH") {
        obj.partitionKey = AttributeName;
      }
      if (KeyType === "RANGE") {
        obj.sortKey = AttributeName;
      }
    }
  }
}

module.exports = Table;
