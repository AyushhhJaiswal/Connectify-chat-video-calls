import { Link, useLocation, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, HomeIcon, Orbit, UsersIcon, MessageSquareDot,MessageCirclePlus,BrainCircuit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";
import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const [mostRecentChatUserId, setMostRecentChatUserId] = useState(null);

  const pendingCount =
    friendRequests?.incomingReqs?.filter((req) => req.status === "pending")
      ?.length || 0;

  // Determine who to chat with when clicking "Chat"
  useEffect(() => {
    const init = async () => {
      if (!authUser) return;

      const client = StreamChat.getInstance(STREAM_API_KEY);
      try {
        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          localStorage.getItem("streamToken") // assuming token is stored
        );

        const filters = { type: "messaging", members: { $in: [authUser._id] } };
        const sort = [{ last_message_at: -1 }];
        const channels = await client.queryChannels(filters, sort, { limit: 1 });

        if (channels.length > 0) {
          const members = Object.keys(channels[0].state.members || {});
          const otherUserId = members.find((id) => id !== authUser._id);
          setMostRecentChatUserId(otherUserId);
        } else if (friendRequests?.acceptedFriends?.length > 0) {
          setMostRecentChatUserId(friendRequests.acceptedFriends[0]._id);
        } else {
          setMostRecentChatUserId(null);
        }
      } catch (err) {
        console.error("Sidebar chat fetch error:", err);
        setMostRecentChatUserId(null);
      }
    };

    init();
  }, [authUser, friendRequests]);

  const handleChatClick = () => {
    if (mostRecentChatUserId) {
      navigate(`/chat/${mostRecentChatUserId}`);
    }
  };

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300">
        <Link to="/" className="flex items-center gap-1.5">
        <Orbit className="w-8 h-9 min-w-[2rem] min-h-[2rem] text-primary" />
          <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-tight">
            Connectify
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link
          to="/"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
            currentPath === "/" ? "btn-active" : ""
          }`}
        >
          <HomeIcon className="size-5 text-base-content opacity-70" />
          <span>Home</span>
        </Link>

        <Link
          to="/friends"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
            currentPath === "/friends" ? "btn-active" : ""
          }`}
        >
          <UsersIcon className="size-5 text-base-content opacity-70" />
          <span>Friends</span>
        </Link>

        <Link
          to="/notifications"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case relative ${
            currentPath === "/notifications" ? "btn-active" : ""
          }`}
        >
          <div className="relative">
            <BellIcon className="size-5 text-base-content opacity-70" />
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white">
                {pendingCount}
              </span>
            )}
          </div>
          <span>Notifications</span>
        </Link>

        <button
          disabled={!mostRecentChatUserId}
          onClick={handleChatClick}
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
            currentPath.startsWith("/chat") ? "btn-active" : ""
          } ${!mostRecentChatUserId ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <MessageSquareDot className="size-5 text-base-content opacity-70" />
          <span>Chat</span>
        </button>


        <Link
          to="/community"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
            currentPath === "/community" ? "btn-active" : ""
          }`}
        >
          <MessageCirclePlus className="size-5 text-base-content opacity-70" />
          <span>Communities</span>
        </Link>


        <Link
  to="/ai-chat"
  className={`relative btn justify-start w-full gap-3 px-3 normal-case overflow-hidden transition-all duration-300 ${
    currentPath === "/ai-chat"
      ? "btn-active border-2 border-primary"
      : "btn-ghost"
  }`}
>
  {/* Glow effect */}
  {currentPath !== "/ai-chat" && (
    <span className="absolute -inset-px rounded-md bg-gradient-to-r from-primary to-secondary opacity-40 animate-pulse blur-sm" />
  )}

  {/* Icon */}
  <BrainCircuit className="size-5 text-primary drop-shadow-sm relative z-10" />
  <span className="font-semibold text-xl text-primary relative z-10">
    Chat with AI
  </span>
</Link>




      </nav>

      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 mt-auto">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full">
              <img src={authUser?.profilePic} alt="User Avatar" />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{authUser?.fullName}</p>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="size-2 rounded-full bg-success inline-block" />
              Online
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
