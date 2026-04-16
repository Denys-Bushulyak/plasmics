import { HTMLAttributes } from "react";
import styles from "./Button.module.css";

type CustomButtonProps = HTMLAttributes<HTMLButtonElement> & {
  disabled: boolean;
};

export default function CustomButton(props: CustomButtonProps) {
  const { className, ...rest } = props;

  return <button className={`${styles.root} ${className}`} {...rest}></button>;
}
