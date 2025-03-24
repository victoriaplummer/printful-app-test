"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

interface PrintfulUserData {
  result: {
    user: {
      id: number;
      username: string;
      email: string;
    };
  };
}

export default function Home() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<PrintfulUserData | null>(null);

  const testApi = async () => {
    try {
      const response = await fetch("/api/printful/whoami");
      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error("Error testing API:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">Printful OAuth App</h1>

        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          {session ? (
            <div className="flex flex-col items-center gap-4">
              <p>Signed in as {session.user?.name}</p>
              <button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                onClick={testApi}
              >
                Test Printful API
              </button>
              <button
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => signOut()}
              >
                Sign Out
              </button>
              {userData && (
                <pre className="mt-4 p-4 bg-gray-100 rounded">
                  {JSON.stringify(userData, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => signIn("printful")}
            >
              Sign in with Printful
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
