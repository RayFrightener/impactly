import { handleSignIn } from "@/app/actions/auth";

export default function SignIn() {
  return (
    <form action={handleSignIn}>
      <button
        type="submit"
        className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors cursor-pointer"
      >
        Try Impactly
      </button>
    </form>
  );
}
