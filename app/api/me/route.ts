import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // En mode local, retourner un utilisateur fictif
  if (
    process.env.LOCAL_MODE === "true" ||
    process.env.NEXT_PUBLIC_LOCAL_MODE === "true"
  ) {
    return NextResponse.json(
      {
        user: {
          id: "local-user",
          name: "Local User",
          preferred_username: "local",
          avatar: null,
          isLocalMode: true,
        },
        errCode: null,
      },
      { status: 200 }
    );
  }

  const authHeaders = await headers();
  const token = authHeaders.get("Authorization");
  if (!token) {
    return NextResponse.json({ user: null, errCode: 401 }, { status: 401 });
  }

  const userResponse = await fetch("https://huggingface.co/api/whoami-v2", {
    headers: {
      Authorization: `${token}`,
    },
  });

  if (!userResponse.ok) {
    return NextResponse.json(
      { user: null, errCode: userResponse.status },
      { status: userResponse.status }
    );
  }
  const user = await userResponse.json();
  return NextResponse.json({ user, errCode: null }, { status: 200 });
}
