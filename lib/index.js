"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const create_1 = require("./CRUD/create");
const delete_1 = require("./CRUD/delete");
const get_1 = require("./CRUD/get");
const getAll_1 = require("./CRUD/getAll");
const query_1 = require("./CRUD/query");
const transactWrite_1 = require("./CRUD/transactWrite");
const update_1 = require("./CRUD/update");
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
class Table {
    static transactWrite(transactions, options = {}, libOptions = { verbose: false, conditions: {} }) {
        const { verbose, conditions } = libOptions;
        return transactWrite_1.default({ docClient, transactions, options, verbose });
    }
    constructor(name) {
        this.tableName = name;
        this.initialized = false;
        this.partitionKey = undefined;
        this.sortKey = undefined;
        this.indexMap = new Map();
    }
    initTable() {
        return __awaiter(this, void 0, void 0, function* () {
            const tableInfo = yield dynamodb.describeTable({ TableName: this.tableName }).promise();
            console.log("tableInfo", tableInfo);
            this.initialized = true;
            /**
             * Set partitionKey and sortKey
             */
            const { KeySchema, GlobalSecondaryIndexes } = tableInfo;
            const { partitionKey, sortKey } = this.getKeys(KeySchema);
            this.partitionKey = partitionKey;
            this.sortKey = sortKey;
            /**
             * Set indexes
             */
            for (const indexRecord of GlobalSecondaryIndexes) {
                const { partitionKey, sortKey } = this.getKeys(indexRecord.KeySchema);
                //   index.partitionKey = partitionKey;
                //   index.sortKey = sortKey;
                const index = {
                    name: "UsernameIndex",
                    partitionKey: partitionKey,
                    sortKey
                };
                this.indexMap.set(indexRecord.IndexName, index);
            }
        });
    }
    /**
     * Check if the key is valid for this table
     * @param {} key
     */
    isValidKey(key) {
        if (!this.partitionKey) {
            return false;
        }
        return key[this.partitionKey] !== undefined;
    }
    get(key, options, libOptions = { verbose: false, forTrx: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                yield this.initTable();
            }
            if (!this.isValidKey(key)) {
                throw new Error(`key is invalid`);
            }
            const { verbose, forTrx } = libOptions;
            return get_1.default({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
        });
    }
    create(item, options, libOptions = { verbose: false, forTrx: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                yield this.initTable();
            }
            const { verbose, forTrx } = libOptions;
            return create_1.default({ docClient, tableName: this.tableName, item, options, verbose, forTrx });
        });
    }
    delete(key, options, libOptions = { verbose: false, forTrx: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                yield this.initTable();
            }
            if (!this.isValidKey(key)) {
                throw new Error(`Key param contains invalid keyName`);
            }
            const { verbose, forTrx } = libOptions;
            return delete_1.default({ docClient, tableName: this.tableName, key, options, verbose, forTrx });
        });
    }
    update(key, newFields, options, libOptions = { verbose: false, forTrx: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                yield this.initTable();
            }
            if (!this.isValidKey(key)) {
                throw new Error(`Key param contains invalid keyName`);
            }
            const { verbose, forTrx } = libOptions;
            return update_1.default({
                docClient,
                tableName: this.tableName,
                key,
                newFields,
                options,
                verbose,
                forTrx
            });
        });
    }
    query({ indexName, partitionKeyValue, sortKeyOperator, sortKeyValue }, options, libOptions = { verbose: false, pagination: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                yield this.initTable();
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
            return query_1.default({
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
        });
    }
    getAll(param = {}, options, libOptions = { verbose: false, pagination: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized) {
                yield this.initTable();
            }
            const { indexName } = param;
            const { verbose, pagination } = libOptions;
            return getAll_1.default({
                docClient,
                tableName: this.tableName,
                indexName,
                options,
                pagination,
                verbose
            });
        });
    }
    getKeys(KeySchema) {
        let partitionKey;
        let sortKey;
        for (const { AttributeName, KeyType } of KeySchema) {
            if (KeyType === "HASH") {
                partitionKey = AttributeName;
            }
            if (KeyType === "RANGE") {
                sortKey = AttributeName;
            }
        }
        return { partitionKey, sortKey };
    }
}
module.exports = Table;
