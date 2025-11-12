import { handleSignOut } from "@/app/actions/auth";

export default function SignOut() {
  return (
    <form action={handleSignOut}>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors cursor-pointer"
      >
        Sign Out
      </button>
    </form>
  );
}