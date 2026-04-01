"use client";

import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          border: "1px solid #ddd1f5",
          padding: "12px 14px"
        },
        success: {
          style: {
            borderColor: "#bde7c6"
          }
        },
        error: {
          style: {
            borderColor: "#f1b9c4"
          }
        }
      }}
    />
  );
}
