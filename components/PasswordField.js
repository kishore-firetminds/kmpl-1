"use client";

import { useState } from "react";

export default function PasswordField({
  name,
  required,
  defaultValue,
  value,
  onChange,
  placeholder
}) {
  const [show, setShow] = useState(false);

  const inputProps = {
    name,
    required,
    type: show ? "text" : "password",
    placeholder
  };

  if (value !== undefined) inputProps.value = value;
  if (onChange) inputProps.onChange = onChange;
  if (defaultValue !== undefined) inputProps.defaultValue = defaultValue;

  return (
    <div className="password-input-wrap">
      <input {...inputProps} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg viewBox="0 0 24 24" className="eye-icon" aria-hidden="true">
            <path d="M3.2 4.6 19.4 20.8l1.4-1.4-2.5-2.5A12.7 12.7 0 0 0 22 12s-3.6-7-10-7c-1.6 0-3 .4-4.2 1l-3.2-3.2-1.4 1.4Zm5.6 5.6 5.6 5.6a4 4 0 0 1-5.6-5.6ZM12 7c4.5 0 7.4 4.4 8 5-.2.4-1.3 2-3 3.4l-1.7-1.7a4 4 0 0 0-5.7-5.7L8.3 6.7A8.8 8.8 0 0 1 12 7Zm-8 5s3.6 7 10 7c1.2 0 2.4-.2 3.5-.7l-1.7-1.7c-.6.2-1.2.4-1.8.4-4.5 0-7.4-4.4-8-5 .2-.4 1.2-1.8 2.8-3.1L7.3 7.4A12.7 12.7 0 0 0 4 12Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="eye-icon" aria-hidden="true">
            <path d="M12 5c-6.4 0-10 7-10 7s3.6 7 10 7 10-7 10-7-3.6-7-10-7Zm0 12c-4.5 0-7.4-4.4-8-5 .6-.6 3.5-5 8-5s7.4 4.4 8 5c-.6.6-3.5 5-8 5Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
