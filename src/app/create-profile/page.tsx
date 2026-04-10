import CreateProfile from '@/components/auth/CreateProfile';

export default function CreateProfilePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8 bg-background">
      <div className="w-full max-w-md mx-auto">
         <h1 className="text-3xl font-bold text-center mb-6 font-headline text-primary">
          Create Your Profile
        </h1>
        <CreateProfile />
      </div>
    </main>
  );
}
