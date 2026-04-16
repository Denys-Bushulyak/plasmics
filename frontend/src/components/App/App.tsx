import { useEffect } from "react";
import { useCounterStore } from "@/store";
import { PULL_INTERVAL } from "@/constrains";
import { Counter } from "@/components/Counter";
import styles from "./App.module.css";
import Button from "@/components/Button";
import Error from "@/components/Error";

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
        <Button onClick={increment} disabled={isLoading}>
          Increment
        </Button>
        <Button onClick={decrement} disabled={isLoading}>
          Decrement
        </Button>
      </span>
      {!!error && <Error>{error}</Error>}
    </div>
  );
}
