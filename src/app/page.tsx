import SignIn from "@/components/sign-in";
import LandingJournalDemo from "@/components/LandingJournalDemo";

export default function Home() {
  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: "var(--theme-background)" }}
    >
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto w-full">
          {/* Main Title */}
          <h1 
            className="text-5xl md:text-7xl font-bold mb-6"
            style={{ 
              background: "linear-gradient(to right, var(--theme-accent), var(--theme-button))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Impactly
          </h1>

          {/* Value Proposition */}
          <p 
            className="text-xl md:text-2xl mb-4 leading-relaxed font-medium"
            style={{ color: "var(--theme-text-primary)" }}
          >
            Start journaling and transform your thoughts into action
          </p>
          
          <p 
            className="text-base md:text-lg mb-8 leading-relaxed max-w-2xl mx-auto"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            A mental space where you can drop your thoughts, let the system organize them, 
            and focus on what matters. Zero cognitive load. Just type, we organize.
          </p>

          {/* Primary CTA */}
          <div className="mb-12">
            <SignIn />
          </div>
        </div>
      </section>

      {/* Journal Feature Showcase */}
      <section 
        className="px-6 py-16 md:py-24"
        style={{ backgroundColor: "var(--theme-surface)" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: "var(--theme-text-primary)" }}
            >
              Experience Journal Mode
            </h2>
            <p 
              className="text-lg md:text-xl max-w-2xl mx-auto"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              Stream-of-consciousness journaling that auto-saves and organizes your thoughts. 
              No friction. No cognitive load. Just pure mental space.
            </p>
          </div>

          {/* Interactive Demo */}
          <div className="mb-12">
            <LandingJournalDemo />
          </div>

          {/* Demo Instructions */}
          <div 
            className="max-w-2xl mx-auto p-6 rounded-xl border mb-8"
            style={{
              backgroundColor: "var(--theme-card)",
              borderColor: "var(--theme-border)",
            }}
          >
            <p 
              className="text-sm md:text-base leading-relaxed"
              style={{ color: "var(--theme-text-secondary)" }}
            >
              <strong style={{ color: "var(--theme-text-primary)" }}>Try it:</strong> Type your thoughts and press Shift+Enter to commit. 
              Double-click any thought to edit. Select text to extract as action items, requirements, features, or improvements.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div 
              className="p-6 rounded-xl border"
              style={{ 
                backgroundColor: "var(--theme-card)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div 
                className="text-2xl mb-3"
                style={{ color: "var(--theme-accent)" }}
              >
                ⚡
              </div>
              <h3 
                className="font-semibold text-lg mb-2"
                style={{ color: "var(--theme-text-primary)" }}
              >
                Zero Cognitive Load
              </h3>
              <p 
                className="text-sm"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Just type. We handle the tracking, organization, and remembering. 
                You focus on thinking.
              </p>
            </div>

            <div 
              className="p-6 rounded-xl border"
              style={{ 
                backgroundColor: "var(--theme-card)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div 
                className="text-2xl mb-3"
                style={{ color: "var(--theme-accent)" }}
              >
                💾
              </div>
              <h3 
                className="font-semibold text-lg mb-2"
                style={{ color: "var(--theme-text-primary)" }}
              >
                Auto-Save Everything
              </h3>
              <p 
                className="text-sm"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Never lose a thought. Everything saves automatically as you type. 
                Your mental space is always preserved.
              </p>
            </div>

            <div 
              className="p-6 rounded-xl border"
              style={{ 
                backgroundColor: "var(--theme-card)",
                borderColor: "var(--theme-border)",
              }}
            >
              <div 
                className="text-2xl mb-3"
                style={{ color: "var(--theme-accent)" }}
              >
                🎯
              </div>
              <h3 
                className="font-semibold text-lg mb-2"
                style={{ color: "var(--theme-text-primary)" }}
              >
                Thought Organization
              </h3>
              <p 
                className="text-sm"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Your stream of consciousness becomes organized thoughts, 
                action items, and insights automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl md:text-4xl font-bold mb-6"
            style={{ color: "var(--theme-text-primary)" }}
          >
            Turn Thoughts Into Action
          </h2>
          <p 
            className="text-lg md:text-xl mb-8 leading-relaxed"
            style={{ color: "var(--theme-text-secondary)" }}
          >
            Impactly combines impact-focused planning, stream-of-consciousness journaling, 
            and visual workflow management in one place. Built for solo creators and small teams 
            who want to track progress, capture ideas, and organize work without the mental overhead.
          </p>
          <div className="mt-10">
            <SignIn />
          </div>
        </div>
      </section>
    </div>
  );
}
