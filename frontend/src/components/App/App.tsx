import { useEffect } from "react";
import { useCounterStore } from "@/store";
import { PULL_INTERVAL } from "@/constrains";
import { Counter } from "@/components/Counter";
import styles from "./App.module.css";

export default function App() {
  const { fetchCurrent, increment, decrement, isLoading, error, value } =
    useCounterStore();

  useEffect(() => {
    fetchCurrent();

    // Poll for updates every 2 seconds to sync across tabs/devices
    const interval = setInterval(() => {
      fetchCurrent();
    }, PULL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchCurrent]);

  return (
    <div className={styles.root}>
      <Counter value={value} />
      <span>
        <button onClick={increment} disabled={isLoading}>
          Increment
        </button>
        <button onClick={decrement} disabled={isLoading}>
          Decrement
        </button>
      </span>
      <footer>{error}</footer>
    </div>
  );
}
