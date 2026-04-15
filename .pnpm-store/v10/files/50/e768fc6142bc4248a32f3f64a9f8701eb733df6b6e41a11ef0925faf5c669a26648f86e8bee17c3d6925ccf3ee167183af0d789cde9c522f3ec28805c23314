import { QueryArrayConfig, QueryArrayResult, QueryConfig, QueryResult, ClientBase, ClientConfig } from 'pg';
import { Logger } from './logger.js';

interface DB {
    query(queryConfig: QueryArrayConfig, values?: any[]): Promise<QueryArrayResult>;
    query(queryConfig: QueryConfig): Promise<QueryResult>;
    query(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>;
    select(queryConfig: QueryArrayConfig, values?: any[]): Promise<any[]>;
    select(queryConfig: QueryConfig): Promise<any[]>;
    select(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<any[]>;
}
interface DBConnection extends DB {
    createConnection(): Promise<void>;
    column(columnName: string, queryConfig: QueryArrayConfig, values?: any[]): Promise<any[]>;
    column(columnName: string, queryConfig: QueryConfig): Promise<any[]>;
    column(columnName: string, queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<any[]>;
    connected: () => boolean;
    addBeforeCloseListener: (listener: any) => number;
    close(): Promise<void>;
}
declare function db(connection: ClientBase | string | ClientConfig, logger?: Logger): DBConnection;

export { type DB, type DBConnection, db };
