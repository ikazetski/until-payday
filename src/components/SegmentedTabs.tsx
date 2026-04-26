import { cn } from "@/lib/utils";

type SegmentedTabsOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  value: T;
  options: SegmentedTabsOption<T>[];
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <div className="grid grid-cols-2 rounded-[24px] bg-gray-100 p-1">
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-14 rounded-[20px] text-base font-medium transition-all",
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}