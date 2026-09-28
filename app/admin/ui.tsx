"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "./actions";

/**
 * Calls a server action on submit and shows inline success/error feedback.
 * (We submit via onSubmit rather than `<form action>` so React doesn't reset
 * the fields — on a validation error the owner keeps what they typed.)
 */
export function useActionSubmit(action: (prev: ActionState, form: FormData) => Promise<ActionState>) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setState(await action(state, fd));
    });
  };
  return { state, pending, onSubmit };
}

export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className = "",
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const { state, pending, onSubmit } = useActionSubmit(action);
  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary min-h-11" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <p aria-live="polite" className={`text-sm font-semibold ${state.error ? "text-ember-700" : "text-moss"}`}>
          {state.error ?? state.message ?? ""}
        </p>
      </div>
    </form>
  );
}
