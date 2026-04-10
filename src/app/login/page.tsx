import Login from '@/components/auth/Login';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8 bg-background">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-center mb-6 font-headline text-primary">
          Quad Chess King Hunt
        </h1>
        <Login />
      </div>
    </main>
  );
}
