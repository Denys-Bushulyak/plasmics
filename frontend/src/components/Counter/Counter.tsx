import { PULL_INTERVAL } from "@/constrains";
import styles from "./Counter.module.css";
import CountUp from "react-countup";

const ANIMATION_DURATION = PULL_INTERVAL / 2000;

export function Counter(props: { fromValue: number; toValue: number }) {
  return (
    <h1 className={styles.root}>
      <CountUp
        start={props.fromValue}
        end={props.toValue}
        duration={ANIMATION_DURATION}
      />
    </h1>
  );
}
