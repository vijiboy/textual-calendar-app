import { Head } from "$fresh/runtime.ts";
import EventEditor from "../islands/EventEditor.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Calendar Event Generator</title>
      </Head>
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto py-6">
          <h1 class="text-2xl font-bold mb-6">Calendar Event Generator</h1>
          <EventEditor />
        </div>
      </div>
    </>
  );
}
