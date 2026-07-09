"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";

type ToasterProps = React.ComponentProps<typeof ToastContainer>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();

  return (
    <ToastContainer
      theme={(theme === "system" ? "dark" : theme) as ToasterProps["theme"]}
      position="top-right"
      closeButton
      pauseOnFocusLoss={false}
      draggable={false}
      toastClassName="!bg-background !text-foreground !border !border-border !shadow-lg"
      {...props}
    />
  );
};

export { Toaster };
