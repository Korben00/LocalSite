import { NextRequest, NextResponse } from "next/server";
import { RepoDesignation, spaceInfo, uploadFile } from "@huggingface/hub";

import { isAuthenticated } from "@/lib/auth";
import Project from "@/models/Project";
import dbConnect from "@/lib/mongodb";
import { getPTag } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: { namespace: string; repoId: string } }
) {
  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { namespace, repoId } = params;

  const project = await Project.findOne({
    user_id: user.id,
    space_id: `${namespace}/${repoId}`,
  }).lean();
  if (!project) {
    return NextResponse.json(
      {
        ok: false,
        error: "Project not found",
      },
      { status: 404 }
    );
  }
  const space_url = `https://huggingface.co/spaces/${namespace}/${repoId}/raw/main/index.html`;
  try {
    const space = await spaceInfo({
      name: namespace + "/" + repoId,
      accessToken: user.token as string,
      additionalFields: ["author"],
    });

    if (!space || space.sdk !== "static") {
      return NextResponse.json(
        {
          ok: false,
          error: "Space is not a static space",
        },
        { status: 404 }
      );
    }
    if (space.author !== user.name) {
      return NextResponse.json(
        {
          ok: false,
          error: "Space does not belong to the authenticated user",
        },
        { status: 403 }
      );
    }

    const response = await fetch(space_url);
    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to fetch space HTML",
        },
        { status: 404 }
      );
    }
    let html = await response.text();
    // remove the last p tag including this url https://enzostvs-deepsite.hf.space
    html = html.replace(getPTag(namespace + "/" + repoId), "");

    return NextResponse.json(
      {
        project: {
          ...project,
          html,
        },
        ok: true,
      },
      { status: 200 }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.statusCode === 404) {
      await Project.deleteOne({
        user_id: user.id,
        space_id: `${namespace}/${repoId}`,
      });
      return NextResponse.json(
        { error: "Space not found", ok: false },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message, ok: false },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { namespace: string; repoId: string } }
) {
  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { namespace, repoId } = params;
  const { html, prompts } = await req.json();

  const project = await Project.findOne({
    user_id: user.id,
    space_id: `${namespace}/${repoId}`,
  }).lean();
  if (!project) {
    return NextResponse.json(
      {
        ok: false,
        error: "Project not found",
      },
      { status: 404 }
    );
  }

  const repo: RepoDesignation = {
    type: "space",
    name: `${namespace}/${repoId}`,
  };

  const newHtml = html.replace(/<\/body>/, `${getPTag(repo.name)}</body>`);
  const file = new File([newHtml], "index.html", { type: "text/html" });
  await uploadFile({
    repo,
    file,
    accessToken: user.token as string,
    commitTitle: `${prompts[prompts.length - 1]} - Follow Up Deployment`,
  });

  await Project.updateOne(
    { user_id: user.id, space_id: `${namespace}/${repoId}` },
    {
      $set: {
        prompts: [
          ...(project && "prompts" in project ? project.prompts : []),
          ...prompts,
        ],
      },
    }
  );
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { namespace: string; repoId: string } }
) {
  const user = await isAuthenticated();

  if (user instanceof NextResponse || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const { namespace, repoId } = params;

  const space = await spaceInfo({
    name: namespace + "/" + repoId,
    accessToken: user.token as string,
    additionalFields: ["author"],
  });

  if (!space || space.sdk !== "static") {
    return NextResponse.json(
      {
        ok: false,
        error: "Space is not a static space",
      },
      { status: 404 }
    );
  }
  if (space.author !== user.name) {
    return NextResponse.json(
      {
        ok: false,
        error: "Space does not belong to the authenticated user",
      },
      { status: 403 }
    );
  }

  const project = await Project.findOne({
    user_id: user.id,
    space_id: `${namespace}/${repoId}`,
  }).lean();
  if (project) {
    // redirect to the project page if it already exists
    return NextResponse.json(
      {
        ok: false,
        error: "Project already exists",
        redirect: `/projects/${namespace}/${repoId}`,
      },
      { status: 400 }
    );
  }

  const newProject = new Project({
    user_id: user.id,
    space_id: `${namespace}/${repoId}`,
    prompts: [],
  });

  await newProject.save();
  return NextResponse.json(
    {
      ok: true,
      project: {
        id: newProject._id,
        space_id: newProject.space_id,
        prompts: newProject.prompts,
      },
    },
    { status: 201 }
  );
}
