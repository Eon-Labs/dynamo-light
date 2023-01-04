import {
  DescribeTableCommand,
  DescribeTableCommandOutput,
  DynamoDBClient,
  DynamoDBClientConfig,
  KeySchemaElement
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import deleteItem from "./CRUD/delete";
import getItem from "./CRUD/get";
import createItem from "./CRUD/put";
import queryItems from "./CRUD/query";
import getAllItems from "./CRUD/scan";
import transactWrite from "./CRUD/transactWrite";
import updateItem from "./CRUD/update";
import { DeleteItemInput, GetItemInput, PutItemInput, QueryInput, ScanInput, UpdateItemInput } from "./types";

// Bare-bones DynamoDB Client are more modular and reduces bundle size and improve loading performance over full client "new DynamoDB({});"
// Avoid using the full client because it may be dropped in the next major version.
let dbClient = new DynamoDBClient({});
let docClient = DynamoDBDocumentClient.from(dbClient);

interface IIndex {
  name: string;
  partitionKey: string;
  sortKey: string | undefined;
}

export class Table {
  public static transactWrite(transactions: any, options = { verbose: false }) {
    const { verbose } = options;
    return transactWrite({ docClient, transactions, options, verbose });
  }

  public static replaceDynamoClient(newDbClient: DynamoDBClient, newDocClient: DynamoDBDocumentClient) {
    dbClient = newDbClient;
    docClient = newDocClient;
  }

  public tableName: string;
  public partitionKey: string | undefined;
  public sortKey: string | undefined;
  public indexMap: Map<string, IIndex>;
  public dbClient: DynamoDBClient;
  public docClient: DynamoDBDocumentClient;
  private initialized: boolean;

  constructor(name: string, config?: DynamoDBClientConfig) {
    this.tableName = name;
    this.initialized = false;
    this.partitionKey = undefined;
    this.sortKey = undefined;
    this.indexMap = new Map();
    if (config) {
      this.dbClient = new DynamoDBClient(config);
      this.docClient = DynamoDBDocumentClient.from(this.dbClient);
    } else {
      this.dbClient = dbClient;
      this.docClient = docClient;
    }
  }

  public async initTable(): Promise<void> {
    // const tableInfo: any = await dynamodb.describeTable({ TableName: this.tableName }).promise();
    const tableInfo: DescribeTableCommandOutput = await this.dbClient.send(
      new DescribeTableCommand({
        TableName: this.tableName
      })
    );
    this.initialized = true;
    /**
     * Set partitionKey and sortKey
     */
    const { KeySchema = [], GlobalSecondaryIndexes = [] } = tableInfo.Table!;
    const { partitionKey, sortKey } = this.retrieveKeys(KeySchema);
    this.partitionKey = partitionKey;
    this.sortKey = sortKey;

    /**
     * Set indexes
     */
    for (const indexRecord of GlobalSecondaryIndexes) {
      const { partitionKey: indexPartitionKey, sortKey: indexSortKey } = this.retrieveKeys(indexRecord.KeySchema!);
      const index: IIndex = {
        name: indexRecord.IndexName!,
        partitionKey: indexPartitionKey,
        sortKey: indexSortKey
      };
      this.indexMap.set(indexRecord.IndexName!, index);
    }
  }

  /**
   * Check if the key is valid for this table
   * @param {} key
   */
  public isValidKey(key: any) {
    if (!this.partitionKey) {
      return false;
    }
    /**
     * Check if input key contains non-key fields
     */
    let noExtraField = true;
    for (const objKey of Object.keys(key)) {
      if (this.partitionKey !== objKey && this.sortKey !== objKey) {
        noExtraField = false;
      }
    }
    /**
     * Check if input key contains partitionKey
     */
    const containsPartitionKey = key[this.partitionKey] !== undefined;
    return noExtraField && containsPartitionKey;
  }

  public async get(key: object | string, options: GetItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (typeof key === "string") {
      key = this.parsePartitionKey(key);
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Invalid Key: ${JSON.stringify(key)}`);
    }

    const { verbose, forTrx } = this.retrieveAndDeleteDLOptions(options);

    return getItem({ docClient: this.docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async put(item: any, options: PutItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { verbose, forTrx, autoTimeStamp } = this.retrieveAndDeleteDLOptions(options);

    return createItem({
      docClient: this.docClient,
      tableName: this.tableName,
      item,
      options,
      verbose,
      forTrx,
      autoTimeStamp
    });
  }

  public async delete(key: any, options: DeleteItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (typeof key === "string") {
      key = this.parsePartitionKey(key);
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Invalid Key: ${JSON.stringify(key)}`);
    }

    const { verbose, forTrx } = this.retrieveAndDeleteDLOptions(options);

    return deleteItem({ docClient: this.docClient, tableName: this.tableName, key, options, verbose, forTrx });
  }

  public async update(key: any, newFields: any, options: UpdateItemInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }

    if (typeof key === "string") {
      key = this.parsePartitionKey(key);
    }

    if (!this.isValidKey(key)) {
      throw new Error(`Invalid Key: ${JSON.stringify(key)}`);
    }

    const { verbose, forTrx, autoTimeStamp } = this.retrieveAndDeleteDLOptions(options);

    return updateItem({
      docClient: this.docClient,
      key,
      tableName: this.tableName,
      newFields,
      options,
      verbose,
      forTrx,
      autoTimeStamp
    });
  }

  public async query(
    // queryKey: { indexName?: string; partitionKeyValue: string; sortKeyOperator?: string; sortKeyValue?: string },
    queryKey: {
      indexName?: string;
      partitionKeyValue?: any;
      sortKeyOperator?: string;
      sortKeyValue?: any;
      [key: string]: any;
    },
    options: QueryInput = {}
  ) {
    if (!this.initialized) {
      await this.initTable();
    }

    let { partitionKeyValue, sortKeyValue, sortKeyOperator } = queryKey;
    const { indexName } = queryKey;

    let index;
    if (indexName) {
      index = this.indexMap.get(indexName);
      if (indexName && !index) {
        throw new Error(`Index ${indexName} doesn't belong to table ${this.tableName}`);
      }
    }

    const partitionKey = index ? index.partitionKey : this.partitionKey;
    let sortKey;
    sortKey = index ? index.sortKey : this.sortKey;
    // 如果sortKeyValue不存在，则设置sortKey为undefined
    if (queryKey[sortKey] === undefined && queryKey.sortKeyValue === undefined) {
      sortKey = undefined;
    } else {
      if (sortKeyOperator === undefined) {
        sortKeyOperator = "=";
      }
    }

    // 智能填partitionKeyValue和sortKeyValue
    if (partitionKeyValue === undefined) {
      if (queryKey[partitionKey] !== undefined) {
        partitionKeyValue = queryKey[partitionKey];
        delete queryKey[partitionKey];
      } else {
        throw new Error("partitionKeyValue is undefined");
      }

      if (sortKey !== undefined) {
        sortKeyValue = queryKey[sortKey];
        delete queryKey[sortKey];
      }
    }

    const { verbose, pagination } = this.retrieveAndDeleteDLOptions(options);

    return queryItems({
      docClient: this.docClient,
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

  public async scan(param: any = {}, options: ScanInput = {}) {
    if (!this.initialized) {
      await this.initTable();
    }
    const { indexName, filters } = param;

    const { verbose, pagination } = this.retrieveAndDeleteDLOptions(options);

    return getAllItems({
      docClient: this.docClient,
      tableName: this.tableName,
      indexName,
      options,
      pagination,
      verbose
    });
  }

  private retrieveKeys(KeySchema: KeySchemaElement[]): { partitionKey: string; sortKey: string | undefined } {
    let partitionKey: string | undefined;
    let sortKey: string | undefined;
    for (const { AttributeName, KeyType } of KeySchema) {
      if (KeyType === "HASH") {
        partitionKey = AttributeName;
      }
      if (KeyType === "RANGE") {
        sortKey = AttributeName;
      }
    }
    if (partitionKey === undefined) {
      throw new Error(`Table ${this.tableName} partitionKey is undefined!`);
    }
    return { partitionKey, sortKey };
  }

  private parsePartitionKey(partitionKeyValue: string): object {
    return {
      [this.partitionKey as string]: partitionKeyValue
    };
  }

  /**
   * Retrieve options specified by DL(dynamo-light), and remove them from the option param
   * @param options
   */
  private retrieveAndDeleteDLOptions(options) {
    const { verbose = false, forTrx = false, autoTimeStamp = false, pagination = true } = options;
    delete options.verbose;
    delete options.forTrx;
    delete options.autoTimeStamp;
    delete options.pagination;

    return {
      verbose,
      forTrx,
      autoTimeStamp,
      pagination
    };
  }
}
