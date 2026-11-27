import { messages } from "@/lib/messages";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{messages.app.name}</h1>
      <p className="text-muted-foreground">{messages.app.tagline}</p>
    </main>
  );
}
