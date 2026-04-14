import React, { createContext, useContext, useState, useCallback } from "react";

const DataChangeContext = createContext();

export function DataChangeProvider({ children }) {
  const [dataChanged, setDataChanged] = useState(0);

  const notifyDataChanged = useCallback(() => {
    setDataChanged((prev) => prev + 1);
  }, []);

  return (
    <DataChangeContext.Provider value={{ dataChanged, notifyDataChanged }}>
      {children}
    </DataChangeContext.Provider>
  );
}

export function useDataChange() {
  return useContext(DataChangeContext);
}
