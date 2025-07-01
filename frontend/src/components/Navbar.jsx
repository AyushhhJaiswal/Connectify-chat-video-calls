import { BellIcon, LogOutIcon, Orbit } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import useAuthUser from "../hooks/useAuthUser";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const showLogo = location.pathname?.startsWith("/chat") || location.pathname?.startsWith("/community");
  const { logoutMutation } = useLogout();

  const { data: friendRequests, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });
  
  // Count only pending incoming requests
  const pendingCount = friendRequests?.incomingReqs?.filter(
    (req) => req.status === "pending"
  )?.length || 0;
  

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end w-full">
          {showLogo && (
            <div className="pl-5">
              <Link to="/" className="flex items-center gap-2">
                <Orbit className="size-10 text-primary" />
                <span className="text-4xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-tight">
                  Connectify
                </span>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <Link to="/notifications">
  <div className="relative">
    <button className="btn btn-ghost btn-circle">
      <BellIcon className="h-6 w-6 text-base-content opacity-70" />
    </button>

    {/* Count badge */}
    {pendingCount > 0 && (
      <span  className="absolute right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white"
      style={{ top: "-0.01rem" }}>
        {pendingCount}
      </span>
    )}
  </div>
</Link>

          </div>

          <ThemeSelector />

          <div className="avatar">
            <div className="w-9 rounded-full">
              <img src={authUser?.profilePic} alt="User Avatar" rel="noreferrer" />
            </div>
          </div>

          <button className="btn btn-ghost btn-circle" onClick={logoutMutation}>
            <LogOutIcon className="h-6 w-6 text-base-content opacity-70" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;