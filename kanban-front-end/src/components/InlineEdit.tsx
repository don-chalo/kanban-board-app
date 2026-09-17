import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

interface InlineEditProps {
  value: string;
  displayText?: string;
  editable: boolean;
  inputLabel: string;
  placeholder?: string;
  displayClassName?: string;
  inputClassName?: string;
  validate?: (value: string) => string | null;
  onSave: (value: string) => Promise<void>;
}

export default function InlineEdit({
  value,
  displayText,
  editable,
  inputLabel,
  placeholder,
  displayClassName,
  inputClassName,
  validate,
  onSave,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    if (!editable) {
      return;
    }
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    if (busyRef.current) {
      return;
    }
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    if (busyRef.current) {
      return;
    }
    if (event.relatedTarget !== null && event.currentTarget.parentElement?.contains(event.relatedTarget)) {
      return;
    }
    cancelEdit();
  }

  async function commit() {
    if (busyRef.current) {
      return;
    }
    const trimmed = draft.trim();
    const problem = validate === undefined ? null : validate(draft);
    if (problem !== null) {
      setError(problem);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      setError("Could not save.");
      setEditing(false);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const rendered = displayText ?? value;

  if (!editing) {
    return (
      <span className="flex flex-col gap-1">
        {editable ? (
          <button
            type="button"
            onClick={startEdit}
            aria-label={`Edit ${inputLabel}`}
            className={displayClassName}
          >
            {rendered}
          </button>
        ) : (
          <span className={displayClassName}>{rendered}</span>
        )}
        {error !== null && (
          <span role="alert" className="text-xs tracking-widest">
            ERR: {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <input
        ref={inputRef}
        aria-label={inputLabel}
        value={draft}
        disabled={busy}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={inputClassName ?? displayClassName}
      />
      {error !== null && (
        <span role="alert" className="text-xs tracking-widest">
          ERR: {error}
        </span>
      )}
    </span>
  );
}