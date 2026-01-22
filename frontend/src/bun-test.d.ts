/// <reference types="bun-types" />
/// <reference types="@testing-library/jest-dom" />

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'bun:test' {
  // Re-export Jest-compatible test APIs from Bun
  export const describe: typeof import('@jest/globals').describe
  export const it: typeof import('@jest/globals').it
  export const test: typeof import('@jest/globals').test
  export const expect: typeof import('@jest/globals').expect
  export const beforeEach: typeof import('@jest/globals').beforeEach
  export const afterEach: typeof import('@jest/globals').afterEach
  export const beforeAll: typeof import('@jest/globals').beforeAll
  export const afterAll: typeof import('@jest/globals').afterAll
  
  // Jest namespace with mock, importActual, etc.
  export namespace jest {
    function mock(moduleName: string, factory?: () => unknown): typeof jest
    function unmock(moduleName: string): typeof jest
    function doMock(moduleName: string, factory?: () => unknown): typeof jest
    function dontMock(moduleName: string): typeof jest
    function importActual<T = any>(moduleName: string): Promise<T>
    function importMock<T = any>(moduleName: string): Promise<T>
    function resetModules(): typeof jest
    function clearAllMocks(): typeof jest
    function resetAllMocks(): typeof jest
    function restoreAllMocks(): typeof jest
    function fn<T extends (...args: any[]) => any>(implementation?: T): jest.Mock<T>
    function spyOn<T extends object, M extends keyof T>(object: T, method: M): jest.SpyInstance<T[M]>
    
    interface Mock<T extends (...args: any[]) => any = (...args: any[]) => any> {
      (...args: Parameters<T>): ReturnType<T>
      mockImplementation(fn: T): this
      mockReturnValue(value: ReturnType<T>): this
      mockResolvedValue(value: Awaited<ReturnType<T>>): this
      mockRejectedValue(value: unknown): this
      mockClear(): this
      mockReset(): this
      mockRestore(): this
      getMockName(): string
      mockName(name: string): this
    }
    
    interface SpyInstance<T = unknown> {
      mockImplementation(fn: (...args: any[]) => any): this
      mockReturnValue(value: T): this
      mockResolvedValue(value: Awaited<T>): this
      mockRejectedValue(value: unknown): this
      mockClear(): this
      mockReset(): this
      mockRestore(): this
      getMockName(): string
      mockName(name: string): this
    }
  }
  
  // Extend Matchers with jest-dom matchers using declaration merging
  interface Matchers<R = void> extends TestingLibraryMatchers<typeof expect.stringContaining, R> {}
}
