import { AsyncLocalStorage } from 'async_hooks';

export const asyncLocalStorage = new AsyncLocalStorage();

export const setStoreUser = (userId) => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.userId = userId;
  }
};
