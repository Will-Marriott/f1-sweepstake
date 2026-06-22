type Table<T> = {
  key: keyof T;
  label: string;
};

function Table<T extends object>({
  tableData,
  columns,
  title,
  subtitle,
}: {
  tableData: T[];
  columns: Table<T>[];
  title?: string;
  subtitle?: string;
}) {
  if (tableData.length === 0) return <div>No data</div>;

  return (
    <div className="w-full h-fit">
      {title && <h2 className="font-bold">{title}</h2>}
      {subtitle && <p className="text-sm text-gray-500 mb-2">{subtitle}</p>}
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} scope="col" className="text-left">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={String(col.key)}>{String(row[col.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
