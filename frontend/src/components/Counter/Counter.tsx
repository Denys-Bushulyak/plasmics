import styles from "./Counter.module.css";

export function Counter(props: { value: number }) {
  return <h1 className={styles.root}>{props.value}</h1>;
}
