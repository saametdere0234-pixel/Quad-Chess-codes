import Game from '@/components/game/Game';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8 bg-background">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-6 font-headline text-primary">
          Quad Chess King Hunt
        </h1>
        <Game />
      </div>
    </main>
  );
}
