type Status = "green" | "yellow" | "red";

type StatusIndicatorProps = {
  status: Status;
};

const statusConfig = {
  green: {
    activeTrack: "bg-emerald-500",
    activeIndex: 0,
  },
  yellow: {
    activeTrack: "bg-amber-500",
    activeIndex: 1,
  },
  red: {
    activeTrack: "bg-red-500",
    activeIndex: 2,
  },
} as const;

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="mb-3 px-1">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`h-2 rounded-full ${
              config.activeIndex === index ? config.activeTrack : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}