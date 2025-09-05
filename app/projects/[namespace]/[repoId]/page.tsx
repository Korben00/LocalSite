import { cookies, headers } from "next/headers";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

// Use fetch on the server to call internal API
import MY_TOKEN_KEY from "@/lib/get-cookie-name";
const ClientEditor = dynamic(
  () => import("@/components/editor").then((m) => m.AppEditor),
  { ssr: false }
);

async function getProject(namespace: string, repoId: string) {
  // TODO replace with a server action
  const cookieStore = await cookies();
  const token = cookieStore.get(MY_TOKEN_KEY())?.value;
  if (!token) return {};
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const urlBase = `${host.includes("localhost") ? "http" : "https"}://${host}`;
    const res = await fetch(`${urlBase}/api/me/projects/${namespace}/${repoId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return {} as any;
    const data = await res.json();
    return data.project;
  } catch {
    return {};
  }
}

export default async function ProjectNamespacePage({
  params,
}: {
  params: { namespace: string; repoId: string };
}) {
  const { namespace, repoId } = params;
  const project = await getProject(namespace, repoId);
  if (!project?.html) {
    redirect("/projects");
  }
  return <ClientEditor project={project} />;
}
