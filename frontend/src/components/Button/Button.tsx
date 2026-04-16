import { PropsWithChildren } from "react";
import styles from "./Button.module.css";
import { useDebounceFn } from "ahooks";

type CustomButtonProps = PropsWithChildren<{
  onClick: () => void;
}>;

export default function CustomButton(props: CustomButtonProps) {
  const { run: clickEvent } = useDebounceFn(props.onClick, { wait: 1000 });

  return (
    <button className={styles.root} onClick={clickEvent}>
      {props.children}
    </button>
  );
}
