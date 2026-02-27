function Tile({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-container p-4 shadow-md w-full h-full">
      {children}
    </div>
  );
}

export default Tile;
