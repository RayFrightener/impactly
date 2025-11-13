"use client";

import { handleSignIn } from "@/app/actions/auth";

export default function SignIn() {
  return (
    <form action={handleSignIn}>
      <button
        type="submit"
        className="px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 hover:opacity-90"
        style={{
          backgroundColor: "var(--theme-button)",
          color: "var(--theme-button-text)",
        }}
      >
        Start Your First Journal Entry
      </button>
    </form>
  );
}
