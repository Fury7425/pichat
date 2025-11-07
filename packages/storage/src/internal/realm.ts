import Realm from 'realm';
import { schemas, schemaVersion } from './schema';

let realmInstance: Realm | undefined;

export async function getRealm(): Promise<Realm> {
  if (realmInstance) {
    return realmInstance;
  }

  realmInstance = await Realm.open({
    schema: schemas,
    schemaVersion,
    onMigration: (oldRealm, newRealm) => {
      if (oldRealm.schemaVersion < 1) {
        return;
      }
      if (oldRealm.schemaVersion < 2) {
        const conversations = newRealm.objects('Conversation');
        for (let i = 0; i < conversations.length; i += 1) {
          const conv = conversations[i] as any;
          if (conv.unreadCount === undefined) {
            conv.unreadCount = 0;
          }
        }
      }
    }
  });

  return realmInstance;
}

export async function closeRealm(): Promise<void> {
  if (realmInstance && !realmInstance.isClosed) {
    realmInstance.close();
  }
  realmInstance = undefined;
}
