type TableColumn<T> = {
  key: keyof T;
  label: string;
  className?: string;
};

function Table<T extends object>({
  tableData,
  columns,
}: {
  tableData: T[];
  columns: TableColumn<T>[];
}) {
  if (tableData.length === 0) return <div>No data</div>;

  return (
    <div className="w-full h-fit">
      <table className="w-full table-fixed">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className={`text-left ${col.className ?? ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)} className={col.className ?? ""}>
                  {String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
