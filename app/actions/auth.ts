"use server";

import { headers } from "next/headers";

export async function getAuth() {
  const authList = await headers();
  const host = authList.get("host") ?? "localhost:3000";
  const url = host.includes("/spaces/enzostvs")
    ? "enzostvs-deepsite.hf.space"
    : host;
  const redirect_uri =
    `${host.includes("localhost") ? "http://" : "https://"}` +
    url +
    "/auth/callback";

  const loginRedirectUrl = `https://huggingface.co/oauth/authorize?client_id=${process.env.OAUTH_CLIENT_ID}&redirect_uri=${redirect_uri}&response_type=code&scope=openid%20profile%20write-repos%20manage-repos%20inference-api&prompt=consent&state=1234567890`;
  return loginRedirectUrl;
}
