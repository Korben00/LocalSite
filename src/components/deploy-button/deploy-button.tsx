/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import classNames from "classnames";
import { toast } from "react-toastify";
import { FaPowerOff } from "react-icons/fa6";

import SpaceIcon from "@/assets/space.svg";
import Loading from "../loading/loading";
import Login from "../login/login";
import { Auth } from "./../../../utils/types";
import LoadButton from "../load-button/load-button";

const LocalToast = () => (
  <div className="flex items-center justify-center gap-2">
    <span>Site sauvegardé localement!</span>
  </div>
);

function DeployButton({
  html,
  error = false,
  auth,
  setHtml,
  prompts,
}: {
  html: string;
  error: boolean;
  auth?: Auth;
  setHtml: (html: string) => void;
  prompts: string[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");

  const createSpace = async () => {
    if (!title) {
      return toast.error("Please fill all fields");
    }
    setLoading(true);
    try {
      const request = await fetch("/api/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html,
          title,
          path,
          prompts: prompts.length ? prompts : undefined,
        }),
      });
      const response = await request.json();
      if (!response.ok) {
        return toast.error(response.message || "Something went wrong");
      }
      toast.success(<LocalToast />);
      setPath("local/project");
      setLoading(false);
      setOpen(false);
    } catch (error) {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-5">
      <LoadButton auth={auth} setHtml={setHtml} setPath={setPath} />
      <div className="relative flex items-center justify-end">
        {auth &&
          (auth.isLocalUse ? (
            <>
              <div className="bg-amber-500/10 border border-amber-10 text-amber-500 font-semibold leading-5 lg:leading-6 py-1 px-5 text-xs lg:text-sm rounded-md mr-4 select-none">
                Local Usage
              </div>
            </>
          ) : (
            <>
              <button
                className="mr-2 cursor-pointer"
                onClick={() => {
                  if (confirm("Are you sure you want to log out?")) {
                    // go to /auth/logout page
                    window.location.href = "/auth/logout";
                  }
                }}
              >
                <FaPowerOff className="text-lg text-red-500" />
              </button>
              <div className="mr-3 text-xs lg:text-sm text-gray-100 flex items-center gap-2">
                <span>Mode Local</span>
              </div>
            </>
          ))}
        <button
          className={classNames(
            "relative cursor-pointer flex-none flex items-center justify-center rounded-md text-xs lg:text-sm font-semibold leading-5 lg:leading-6 py-1.5 px-5 hover:bg-pink-400 text-white shadow-sm dark:shadow-highlight/20",
            {
              "bg-pink-400": open,
              "bg-pink-500": !open,
            }
          )}
          onClick={() => setOpen(!open)}
        >
          {path ? "Update Space" : "Deploy to Space"}
        </button>
        <div
          className={classNames(
            "h-screen w-screen bg-black/20 fixed left-0 top-0 z-10",
            {
              "opacity-0 pointer-events-none": !open,
            }
          )}
          onClick={() => setOpen(false)}
        ></div>
        <div
          className={classNames(
            "absolute top-[calc(100%+8px)] right-0 z-10 w-80 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-75 overflow-hidden",
            {
              "opacity-0 pointer-events-none": !open,
            }
          )}
        >
          {!auth ? (
            <Login html={html}>
              <p className="text-gray-500 text-sm mb-3">
                Host this project for free and share it with your friends.
              </p>
            </Login>
          ) : (
            <>
              <header className="flex items-center text-sm px-4 py-2 border-b border-gray-200 gap-2 bg-gray-100 font-semibold text-gray-700">
                <span className="text-xs bg-pink-500/10 text-pink-500 rounded-full pl-1.5 pr-2.5 py-0.5 flex items-center justify-start gap-1.5">
                  <img src={SpaceIcon} alt="Space Icon" className="size-4" />
                  Space
                </span>
                Configure Deployment
              </header>
              <main className="px-4 pt-3 pb-4 space-y-3">
                <p className="text-xs text-amber-600 bg-amber-500/10 rounded-md p-2">
                  {path ? (
                    <span>
                      Your space is live at{" "}
                      <a
                        href={`https://huggingface.co/spaces/${path}`}
                        target="_blank"
                        className="underline hover:text-amber-700"
                      >
                        huggingface.co/{path}
                      </a>
                      . You can update it by deploying again.
                    </span>
                  ) : (
                    "Deploy your project to a space on the Hub. Spaces are a way to share your project with the world."
                  )}
                </p>
                {!path && (
                  <div className="flex flex-col gap-2">
                    <p className="text-gray-600 text-sm font-medium mb-1.5">
                      Space Title
                    </p>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-full py-2.5 text-gray-900 bg-gray-100 rounded-md border border-gray-200 px-4 outline-none font-medium text-sm focus:bg-white"
                      placeholder="Mon site"
                    />
                  </div>
                )}
                {error && (
                  <p className="text-red-500 text-xs bg-red-500/10 rounded-md p-2">
                    Your code has errors. Fix them before deploying.
                  </p>
                )}
                <div className="pt-2 text-right">
                  <button
                    disabled={error || loading || (!path && !title)}
                    className="w-full py-2.5 rounded-md bg-blue-500 text-white font-medium text-sm hover:bg-blue-400 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={path ? () => {} : createSpace}
                  >
                    {path ? "Update Space" : "Create Space"}
                    {loading && <Loading />}
                  </button>
                </div>
              </main>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeployButton;
