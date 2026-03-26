import { House, History } from "lucide-react";

type BottomNavProps = {
  activeTab: "home" | "history";
  onChangeTab: (tab: "home" | "history") => void;
};

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        <button
          onClick={() => onChangeTab("home")}
          className={`flex flex-col items-center gap-1 text-xs ${
            activeTab === "home" ? "font-semibold text-gray-900" : "font-medium text-gray-400"
          }`}
        >
          <House className="h-4 w-4" />
          Главная
        </button>

        <button
          onClick={() => onChangeTab("history")}
          className={`flex flex-col items-center gap-1 text-xs ${
            activeTab === "history" ? "font-semibold text-gray-900" : "font-medium text-gray-400"
          }`}
        >
          <History className="h-4 w-4" />
          История
        </button>
      </div>
    </div>
  );
}