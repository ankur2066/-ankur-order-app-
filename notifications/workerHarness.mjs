import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createContext,SourceTextModule,SyntheticModule} from 'node:vm';
const DATABASE_ID='ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
const copy=value=>JSON.parse(JSON.stringify(value));
export async function worker({ records = {}, send, transactionError, source, readError } = {}) {
  const documents = new Map(Object.entries(records));
  const messages = [];
  const logs = [];
  const deletions = [];
  const context = createContext({ console: { info: (...args) => logs.push(copy(args)) } });
  const ref = path => ({
    path,
    get: async () => {if(readError?.(path))throw Error('Fixture read failure');return snapshot(path);},
    delete: async () => { documents.delete(path); deletions.push(path); },
    collection: name => collection(path + '/' + name),
  });
  const snapshot = path => ({
    id: path.split('/').at(-1), ref: ref(path),
    exists: documents.has(path), data: () => documents.get(path),
  });
  function collection(path, predicate = () => true, limit = Infinity) {
    return {
      doc: id => ref(path + '/' + id),
      where: (field, operator, values) => {
        assert.equal(operator, 'in');
        return collection(path, data => values.includes(data[field]), limit);
      },
      limit: count => collection(path, predicate, count),
      get: async () => ({ docs: [...documents.keys()]
        .filter(key => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/'))
        .filter(key => predicate(documents.get(key))).slice(0, limit).map(snapshot) }),
    };
  }
  const db = {
    collection,
    runTransaction: async operation => {
      if (transactionError) throw transactionError;
      return operation({
        get: async reference => snapshot(reference.path),
        delete: reference => { documents.delete(reference.path); deletions.push(reference.path); },
      });
    },
  };
  const sdk = {
    'node:crypto': { createHash },
    'firebase-functions/v2/firestore': {
      onDocumentCreated: (options, handler) => Object.assign(handler, { options }),
      onDocumentUpdated: (options, handler) => Object.assign(handler, { options }),
    },
    'firebase-admin/app': { getApp: () => ({}) },
    'firebase-admin/firestore': { getFirestore: (_app, database) => {
      assert.equal(database, DATABASE_ID, 'worker must never use (default)');
      return db;
    } },
    'firebase-admin/messaging': { getMessaging: () => ({ sendEachForMulticast: async message => {
      messages.push(copy(message));
      if (send) return send(message, documents);
      return { successCount: message.tokens.length, failureCount: 0,
        responses: message.tokens.map(() => ({ success: true })) };
    } }) },
  };
  const module = new SourceTextModule(source ?? readFileSync(new URL('notificationPush.js', import.meta.url), 'utf8'), { context });
  await module.link(specifier => {
    assert.ok(sdk[specifier], 'unexpected dependency: ' + specifier);
    return new SyntheticModule(Object.keys(sdk[specifier]), function () {
      for (const [name, value] of Object.entries(sdk[specifier])) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return { api: module.namespace, messages, logs, documents, deletions };
}

