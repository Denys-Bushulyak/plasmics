const API_URL = import.meta.env.VITE_API_URL;

export const PULL_INTERVAL = 10000;
export const MIN_VALUE = 0;
export const MAX_VALUE = 1_000_000_000;
export const INCREMENT_URL = `${API_URL}/increment`;
export const DECREMENT_URL = `${API_URL}/decrement`;
export const CURRENT_VALUE_URL = `${API_URL}/current`;
