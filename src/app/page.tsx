import SignIn from "@/components/sign-in";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Impactly
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            A project planning and tracking dashboard that combines impact-focused planning, 
            stream-of-consciousness journaling, and visual workflow management.
          </p>
        </div>
        
        <div className="mb-8 text-gray-500 text-sm max-w-lg">
          Built for solo creators and small teams who want to track progress, 
          capture ideas, and organize work in one place.
        </div>

        <div className="mt-6">
          <SignIn />
        </div>
      </main>
    </div>
  );
}
