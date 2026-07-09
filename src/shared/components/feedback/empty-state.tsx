interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-700 p-12 text-center">
      <h3 className="text-lg font-medium text-zinc-300">{title}</h3>
      <p className="max-w-md text-sm text-zinc-500">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
