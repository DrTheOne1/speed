import React from "react";
import Table from "./components/Table";
import Form from "./components/Form";
import DarkModeToggle from "./components/DarkModeToggle";

const App = () => {
  const data = [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" },
  ];
  const columns = ["name", "email"];

  return (
    <div className="p-4">
      <DarkModeToggle />
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Improved UI</h1>
      <Form />
      <Table data={data} columns={columns} />
    </div>
  );
};

export default App;