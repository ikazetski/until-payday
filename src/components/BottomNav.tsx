import { ChartPie, History, House } from "lucide-react";

type BottomNavTab = "home" | "analytics" | "history";

type BottomNavProps = {
  activeTab: BottomNavTab;
  onChangeTab: (tab: BottomNavTab) => void;
};

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const getClassName = (tab: BottomNavTab) =>
    `flex flex-col items-center gap-1 text-xs ${
      activeTab === tab
        ? "font-semibold text-gray-900"
        : "font-medium text-gray-400"
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        <button onClick={() => onChangeTab("home")} className={getClassName("home")}>
          <House className="h-4 w-4" />
          Главная
        </button>

        <button
          onClick={() => onChangeTab("analytics")}
          className={getClassName("analytics")}
        >
          <ChartPie className="h-4 w-4" />
          Аналитика
        </button>

        <button
          onClick={() => onChangeTab("history")}
          className={getClassName("history")}
        >
          <History className="h-4 w-4" />
          История
        </button>
      </div>
    </div>
  );
}