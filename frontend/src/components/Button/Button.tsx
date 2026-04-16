import { PropsWithChildren } from "react";
import { useDebounceFn } from "ahooks";

import { THROTTLE_INTERVAL } from "@/constrains";
import styles from "./Button.module.css";

type CustomButtonProps = PropsWithChildren<{
  onClick: () => void;
}>;

export default function CustomButton(props: CustomButtonProps) {
  const { run: clickEvent } = useDebounceFn(props.onClick, {
    wait: THROTTLE_INTERVAL,
  });

  return (
    <button className={styles.root} onClick={clickEvent}>
      {props.children}
    </button>
  );
}
