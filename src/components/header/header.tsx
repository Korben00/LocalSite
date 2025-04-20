import { ReactNode } from "react";
import { MdAdd } from "react-icons/md";

import Logo from "@/assets/logo.svg";

function Header({
  onReset,
  children,
}: {
  onReset: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-gray-900 bg-gray-950 px-3 lg:px-6 py-2 flex justify-between items-center sticky top-0 z-20">
      <div className="flex items-center justify-start gap-3">
        <h1 className="text-white text-lg lg:text-xl font-bold flex items-center justify-start">
          <img
            src={Logo}
            alt="LocalSite Logo"
            className="size-6 lg:size-8 mr-2"
          />
          LocalSite
        </h1>
        <p className="text-gray-700 max-md:hidden">|</p>
        <button
          className="max-md:hidden relative cursor-pointer flex-none flex items-center justify-center rounded-md text-xs font-semibold leading-4 py-1.5 px-3 hover:bg-gray-700 text-gray-100 shadow-sm dark:shadow-highlight/20 bg-gray-800"
          onClick={onReset}
        >
          <MdAdd className="mr-1 text-base" />
          New
        </button>
        <p className="text-gray-500 text-sm max-md:hidden">
          Create websites 100% locally
        </p>
      </div>
      {children}
    </header>
  );
}

export default Header;
