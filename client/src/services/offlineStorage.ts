import { createLogger } from './logging';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const logger = createLogger('offlineStorage');

/**
 * Schema definition for our IndexedDB database
 */
interface TravelPackDB extends DBSchema {
  // Store for tracking operations that need to be synced
  operations: {
    key: number;
    value: {
      id?: number;
      operation: 'create' | 'update' | 'delete';
      entity: string;
      entityId?: number;
      data: any;
      timestamp: number;
      synced: boolean;
      packingListId: number;
    };
    indexes: { 'by-synced': boolean, 'by-packing-list': number };
  };
  
  // Store for caching entities locally
  entities: {
    key: string; // `${entity}:${id}`
    value: {
      id: string; // Changed to string to match the key type
      entity: string;
      data: any;
      lastModified: number;
      packingListId: number;
      version: number;
    };
    indexes: { 'by-entity': string, 'by-packing-list': number };
  };
}

/**
 * Service for offline data storage using IndexedDB
 */
class OfflineStorage {
  private db: IDBPDatabase<TravelPackDB> | null = null;
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve) => {
      try {
        logger.info('Initializing IndexedDB database');
        this.db = await openDB<TravelPackDB>('travel-pack', 1, {
          upgrade(db) {
            logger.info('Creating IndexedDB schema');
            
            // Operations store
            if (!db.objectStoreNames.contains('operations')) {
              const operationsStore = db.createObjectStore('operations', {
                keyPath: 'id',
                autoIncrement: true
              });
              operationsStore.createIndex('by-synced', 'synced');
              operationsStore.createIndex('by-packing-list', 'packingListId');
            }

            // Entities store
            if (!db.objectStoreNames.contains('entities')) {
              const entitiesStore = db.createObjectStore('entities', {
                keyPath: 'id'
              });
              entitiesStore.createIndex('by-entity', 'entity');
              entitiesStore.createIndex('by-packing-list', 'packingListId');
            }
          }
        });

        this.initialized = true;
        logger.info('IndexedDB initialized successfully');
        resolve(true);
      } catch (error) {
        logger.error('Failed to initialize IndexedDB', error);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  /**
   * Save an operation to be synced later
   */
  async saveOperation(operation: Omit<TravelPackDB['operations']['value'], 'id' | 'synced'>): Promise<number> {
    if (!await this.ensureInitialized()) {
      throw new Error('IndexedDB not initialized');
    }

    try {
      const id = await this.db!.add('operations', {
        ...operation,
        synced: false
      });

      logger.debug('Operation saved to offline storage', { id, operation });
      return id;
    } catch (error) {
      logger.error('Failed to save operation to offline storage', error);
      throw error;
    }
  }

  /**
   * Get unsynced operations
   */
  async getUnsynced(packingListId?: number): Promise<TravelPackDB['operations']['value'][]> {
    if (!await this.ensureInitialized()) {
      return [];
    }

    try {
      // Get all operations first
      const allOperations = await this.db!.getAll('operations');
      
      // Then filter them in memory to avoid IndexedDB issues
      let operations = allOperations.filter(op => !op.synced);
      
      // If packingListId is specified, filter further
      if (packingListId !== undefined) {
        operations = operations.filter(op => op.packingListId === packingListId);
      }
      
      // Sort by timestamp
      operations.sort((a, b) => a.timestamp - b.timestamp);

      logger.debug('Retrieved unsynced operations', { count: operations.length });
      return operations;
    } catch (error) {
      logger.error('Failed to get unsynced operations', error);
      return [];
    }
  }

  /**
   * Mark an operation as synced
   */
  async markAsSynced(id: number): Promise<void> {
    if (!await this.ensureInitialized()) {
      return;
    }

    try {
      const tx = this.db!.transaction('operations', 'readwrite');
      const operation = await tx.store.get(id);

      if (operation) {
        operation.synced = true;
        await tx.store.put(operation);
      }

      await tx.done;
      logger.debug('Operation marked as synced', { id });
    } catch (error) {
      logger.error('Failed to mark operation as synced', error);
    }
  }

  /**
   * Cache an entity locally
   */
  async cacheEntity(entity: string, id: number, data: any, packingListId: number, version: number): Promise<void> {
    if (!await this.ensureInitialized()) {
      return;
    }

    try {
      const key = `${entity}:${id}`;

      await this.db!.put('entities', {
        id: key,
        entity,
        data,
        lastModified: Date.now(),
        packingListId,
        version
      });

      logger.debug('Entity cached', { entity, id });
    } catch (error) {
      logger.error('Failed to cache entity', error);
    }
  }

  /**
   * Get an entity from the cache
   */
  async getEntity<T = any>(entity: string, id: number): Promise<T | null> {
    if (!await this.ensureInitialized()) {
      return null;
    }

    try {
      const key = `${entity}:${id}`;
      const result = await this.db!.get('entities', key);
      return result?.data || null;
    } catch (error) {
      logger.error('Failed to get entity from cache', error);
      return null;
    }
  }

  /**
   * Get all entities of a type for a packing list
   */
  async getAllEntities<T = any>(entity: string, packingListId: number): Promise<T[]> {
    if (!await this.ensureInitialized()) {
      return [];
    }

    try {
      const tx = this.db!.transaction('entities', 'readonly');
      const packingListIndex = tx.store.index('by-packing-list');
      const allEntities = await packingListIndex.getAll(packingListId);
      await tx.done;

      // Filter by entity type
      return allEntities
        .filter(item => item.entity === entity)
        .map(item => item.data);
    } catch (error) {
      logger.error('Failed to get all entities from cache', error);
      return [];
    }
  }

  /**
   * Delete an entity from the cache
   */
  async deleteEntity(entity: string, id: number): Promise<void> {
    if (!await this.ensureInitialized()) {
      return;
    }

    try {
      const key = `${entity}:${id}`;
      await this.db!.delete('entities', key);
      logger.debug('Entity deleted from cache', { entity, id });
    } catch (error) {
      logger.error('Failed to delete entity from cache', error);
    }
  }

  /**
   * Clear the entity cache
   */
  async clearCache(packingListId?: number): Promise<void> {
    if (!await this.ensureInitialized()) {
      return;
    }

    try {
      if (packingListId) {
        // Delete all entities for this packing list
        const tx = this.db!.transaction('entities', 'readwrite');
        const index = tx.store.index('by-packing-list');
        const keys = await index.getAllKeys(packingListId);

        for (const key of keys) {
          await tx.store.delete(key);
        }

        await tx.done;
      } else {
        // Clear entire cache
        await this.db!.clear('entities');
      }

      logger.info('Cache cleared', { packingListId: packingListId || 'all' });
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  }

  /**
   * Get pending operation count
   */
  async getPendingOperationCount(packingListId?: number): Promise<number> {
    try {
      const operations = await this.getUnsynced(packingListId);
      return operations.length;
    } catch (error) {
      logger.error('Failed to get pending operation count', error);
      return 0;
    }
  }

  /**
   * Helper to ensure the database is initialized
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    return await this.init();
  }
}

// Create singleton instance
export const offlineStorage = new OfflineStorage();

// Initialize database when the module loads
offlineStorage.init().catch(err => {
  logger.error('Failed to initialize offline storage on load', err);
});