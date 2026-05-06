import React from "react";
import WorkSales from "./WorkSales";

function Pune() {
  return (
    <WorkSales
      title="Pune"
      addButtonLabel="Add Work"
      itemLabel="work"
      itemLabelPlural="works"
      deleteConfirmTitle="Delete this work?"
      worksStatTitle="Works"
    />
  );
}

export default Pune;
