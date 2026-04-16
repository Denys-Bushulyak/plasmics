import { PropsWithChildren } from "react";
import style from "./Error.module.css";

type ErrorProps = PropsWithChildren<{}>;

export default function Error(props: ErrorProps) {
  return <div className={style.root}>{props.children}</div>;
}
