import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
export function Action({ to, children, light = false, ...props }) {
  const content = (
    <>
      {children}
      <span className="action-arrow">
        <ArrowRight size={18} />
      </span>
    </>
  );
  return to ? (
    <Link className={"tt-action" + (light ? " light" : "")} to={to} {...props}>
      {content}
    </Link>
  ) : (
    <button className={"tt-action" + (light ? " light" : "")} {...props}>
      {content}
    </button>
  );
}
export function Field({ label, error, textarea = false, children, ...props }) {
  const inputId = React.useId(),
    control = children ? (
      React.cloneElement(children, {
        id: inputId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? inputId + "-error" : undefined,
      })
    ) : textarea ? (
      <textarea id={inputId} {...props} />
    ) : (
      <input id={inputId} {...props} />
    );
  return (
    <label className="tt-field" htmlFor={inputId}>
      <span>{label}</span>
      {control}
      {error && (
        <small id={inputId + "-error"} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
export function PasswordField({ label, ...props }) {
  const [show, setShow] = useState(false),
    inputId = React.useId();
  return (
    <div className="tt-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input">
        <input id={inputId} type={show ? "text" : "password"} {...props} />
        <button
          type="button"
          aria-label={(show ? "Hide " : "Show ") + label.toLowerCase()}
          aria-pressed={show}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
export function Notice({ children, error = false }) {
  return children ? (
    <div
      className={"tt-notice" + (error ? " error" : "")}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return {
    busy,
    error,
    setError,
    run: async (fn) => {
      if (busy) return;
      setBusy(true);
      setError("");
      try {
        return await fn();
      } catch (e) {
        setError(e.message);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
  };
}
export function Table({ children }) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Data table"
    >
      <table>{children}</table>
    </div>
  );
}
export function PageTitle({ title, description, breadcrumb }) {
  return (
    <section className="tt-title">
      <div className="tt-container">
        {breadcrumb && <p className="breadcrumb">{breadcrumb}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </section>
  );
}
