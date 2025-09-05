import dynamic from "next/dynamic";

const ClientEditor = dynamic(
  () => import("@/components/editor").then((m) => m.AppEditor),
  {
    ssr: false,
    loading: () => (
      <section className="h-[100dvh] bg-neutral-950 flex items-center justify-center text-neutral-300">
        Loading editor...
      </section>
    ),
  }
);

export default function ProjectsNewPage() {
  return <ClientEditor />;
}
