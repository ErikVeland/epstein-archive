import { inspect } from "node:util";
import pg from "pg";
function db(connection, logger = console) {
  const isExternalClient = typeof connection === "object" && "query" in connection && typeof connection.query === "function";
  const client = isExternalClient ? connection : new pg.Client(connection);
  let connectionStatus = isExternalClient ? "EXTERNAL" : "DISCONNECTED";
  const beforeCloseListeners = [];
  const connected = () => connectionStatus === "CONNECTED" || connectionStatus === "EXTERNAL";
  const createConnection = () => new Promise((resolve, reject) => {
    if (connected()) {
      resolve();
    } else if (connectionStatus === "ERROR") {
      reject(
        new Error("Connection already failed, do not try to connect again")
      );
    } else {
      client.connect((err) => {
        if (err) {
          connectionStatus = "ERROR";
          logger.error(`could not connect to postgres: ${inspect(err)}`);
          reject(err);
          return;
        }
        connectionStatus = "CONNECTED";
        resolve();
      });
    }
  });
  const query = async (queryTextOrConfig, values) => {
    await createConnection();
    try {
      return await client.query(queryTextOrConfig, values);
    } catch (error) {
      const { message, position } = error;
      const string = typeof queryTextOrConfig === "string" ? queryTextOrConfig : queryTextOrConfig.text;
      if (message && position >= 1) {
        const endLineWrapIndexOf = string.indexOf("\n", position);
        const endLineWrapPos = endLineWrapIndexOf >= 0 ? endLineWrapIndexOf : string.length;
        const stringStart = string.slice(0, endLineWrapPos);
        const stringEnd = string.slice(endLineWrapPos);
        const startLineWrapPos = stringStart.lastIndexOf("\n") + 1;
        const padding = " ".repeat(position - startLineWrapPos - 1);
        logger.error(`Error executing:
${stringStart}
${padding}^^^^${stringEnd}

${message}
`);
      } else {
        logger.error(`Error executing:
${string}
${error}
`);
      }
      throw error;
    }
  };
  const select = async (queryTextOrConfig, values) => {
    const { rows } = await query(queryTextOrConfig, values);
    return rows;
  };
  const column = async (columnName, queryTextOrConfig, values) => {
    const rows = await select(queryTextOrConfig, values);
    return rows.map((r) => r[columnName]);
  };
  return {
    createConnection,
    query,
    select,
    column,
    connected,
    addBeforeCloseListener: (listener) => beforeCloseListeners.push(listener),
    close: async () => {
      await beforeCloseListeners.reduce(
        (promise, listener) => promise.then(listener).catch((error) => {
          logger.error(error.stack || error);
        }),
        Promise.resolve()
      );
      if (!isExternalClient) {
        connectionStatus = "DISCONNECTED";
        client.end();
      }
    }
  };
}
export {
  db
};
