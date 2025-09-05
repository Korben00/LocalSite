import { NextRequest, NextResponse } from "next/server";
import { createRepo, RepoDesignation, uploadFiles } from "@huggingface/hub";

import { isAuthenticated } from "@/lib/auth";
import Project from "@/models/Project";
import dbConnect from "@/lib/mongodb";
import { COLORS, getPTag } from "@/lib/utils";
// import type user
export async function GET() {
  // En mode local, retourner une liste vide de projets
  if (
    process.env.LOCAL_MODE === "true" ||
    process.env.NEXT_PUBLIC_LOCAL_MODE === "true"
  ) {
    return NextResponse.json(
      {
        ok: true,
        projects: [],
        message: "Projects are not available in local mode"
      },
      { status: 200 }
    );
  }

  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const projects = await Project.find({
    user_id: user?.id,
  })
    .sort({ _createdAt: -1 })
    .limit(100)
    .lean();
  if (!projects) {
    return NextResponse.json(
      {
        ok: false,
        projects: [],
      },
      { status: 404 }
    );
  }
  return NextResponse.json(
    {
      ok: true,
      projects,
    },
    { status: 200 }
  );
}

/**
 * This API route creates a new project in Hugging Face Spaces.
 * It requires an Authorization header with a valid token and a JSON body with the project details.
 */
export async function POST(request: NextRequest) {
  // En mode local, empêcher la création de projets
  if (
    process.env.LOCAL_MODE === "true" ||
    process.env.NEXT_PUBLIC_LOCAL_MODE === "true"
  ) {
    return NextResponse.json(
      { 
        ok: false,
        error: "Project creation is not available in local mode"
      },
      { status: 400 }
    );
  }

  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { title, html, prompts } = await request.json();

  if (!title || !html) {
    return NextResponse.json(
      { message: "Title and HTML content are required.", ok: false },
      { status: 400 }
    );
  }

  await dbConnect();

  try {
    let readme = "";
    let newHtml = html;

    const newTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .split("-")
      .filter(Boolean)
      .join("-")
      .slice(0, 96);

    const repo: RepoDesignation = {
      type: "space",
      name: `${user.name}/${newTitle}`,
    };

    const { repoUrl } = await createRepo({
      repo,
      accessToken: user.token as string,
    });
    const colorFrom = COLORS[Math.floor(Math.random() * COLORS.length)];
    const colorTo = COLORS[Math.floor(Math.random() * COLORS.length)];
    readme = `---
title: ${newTitle}
emoji: 🐳
colorFrom: ${colorFrom}
colorTo: ${colorTo}
sdk: static
pinned: false
tags:
  - deepsite
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference`;

    newHtml = html.replace(/<\/body>/, `${getPTag(repo.name)}</body>`);
    const file = new File([newHtml], "index.html", { type: "text/html" });
    const readmeFile = new File([readme], "README.md", {
      type: "text/markdown",
    });
    const files = [file, readmeFile];
    await uploadFiles({
      repo,
      files,
      accessToken: user.token as string,
      commitTitle: `${prompts[prompts.length - 1]} - Initial Deployment`,
    });
    const path = repoUrl.split("/").slice(-2).join("/");
    const project = await Project.create({
      user_id: user.id,
      space_id: path,
      prompts,
    });
    return NextResponse.json({ project, path, ok: true }, { status: 201 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, ok: false },
      { status: 500 }
    );
  }
}
