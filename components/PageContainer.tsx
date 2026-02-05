
export default function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {children}
    </div>
  );
}
