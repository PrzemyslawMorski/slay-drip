import { Page } from '@playwright/test';
import { generateTestDatabaseName } from './test-data';

/**
 * Test isolation utilities for parallel execution
 */
export class TestIsolation {
  private dbName: string;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.dbName = generateTestDatabaseName();
  }

  /**
   * Initialize isolated test environment
   */
  async setup(): Promise<void> {
    try {
      await this.page.evaluate((dbName) => {
        // Clear localStorage
        localStorage.clear();
        
        // Store the test-specific database name
        localStorage.setItem('test_db_name', dbName);
        
        // Clear any existing IndexedDB with our test name
        if ('indexedDB' in window) {
          indexedDB.deleteDatabase(dbName);
          indexedDB.deleteDatabase('wardrobeState'); // Also clear default
        }
      }, this.dbName);
      
      // Wait a bit for IndexedDB cleanup to complete
      await this.page.waitForTimeout(100);
    } catch (error) {
      console.log('Test setup isolation failed, continuing:', error);
    }
  }

  /**
   * Cleanup isolated test environment
   */
  async cleanup(): Promise<void> {
    try {
      await this.page.evaluate((dbName) => {
        // Clear localStorage
        localStorage.clear();
        
        // Delete our test-specific database
        if ('indexedDB' in window) {
          indexedDB.deleteDatabase(dbName);
          indexedDB.deleteDatabase('wardrobeState'); // Also clear default
        }
      }, this.dbName);
      
      // Wait a bit for cleanup to complete
      await this.page.waitForTimeout(100);
    } catch (error) {
      console.log('Test cleanup failed:', error);
    }
  }

  /**
   * Get the unique database name for this test
   */
  getDatabaseName(): string {
    return this.dbName;
  }

  /**
   * Force a complete reset of all storage
   */
  async forceReset(): Promise<void> {
    try {
      await this.page.evaluate(() => {
        // Clear all localStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Get all IndexedDB databases and delete them
        if ('indexedDB' in window) {
          // Delete common database names
          ['wardrobeState', 'localforage', 'keyval-store'].forEach(name => {
            indexedDB.deleteDatabase(name);
          });
        }
        
        // Clear any cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
      });
      
      // Wait for all operations to complete
      await this.page.waitForTimeout(200);
    } catch (error) {
      console.log('Force reset failed:', error);
    }
  }
}

/**
 * Simplified cleanup for tests that don't need full isolation
 */
export async function simpleCleanup(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      localStorage.clear();
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('wardrobeState');
      }
    });
  } catch (error) {
    console.log('Simple cleanup failed:', error);
  }
}