import { useEffect } from "react";

import { useCounterStore } from "@/store";
import { PULL_INTERVAL } from "@/constrains";
import { Counter } from "@/components/Counter";
import Button from "@/components/Button";
import Error from "@/components/Error";
import styles from "./App.module.css";

export default function App() {
  const {
    fetchCurrent,
    increment,
    previousValue,
    decrement,
    error,
    value,
    isLoading,
    isSending,
  } = useCounterStore();

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
      <Counter fromValue={previousValue} toValue={value} />
      <span>
        <Button onClick={increment} disabled={isSending}>
          Increment
        </Button>
        <Button onClick={decrement} disabled={isSending}>
          Decrement
        </Button>
      </span>
      {!!error && <Error>{error}</Error>}
    </div>
  );
}
