import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ActivityItem {
  name: string;
  date: string;
  localCode: string;
}

interface ActivityContextType {
  activity: ActivityItem[];
  addActivity: (item: ActivityItem) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const addActivity = useCallback((item: ActivityItem) => {
    setActivity((prev) => [item, ...prev].slice(0, 20));
  }, []);

  return (
    <ActivityContext.Provider value={{ activity, addActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
};
