import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserFriends, getStreamToken } from "../lib/api";
import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { StreamChat } from "stream-chat";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatSidebar = () => {
  const { authUser } = useAuthUser();
  const { pathname } = useLocation();

  const [onlineStatus, setOnlineStatus] = useState({});
  const [client, setClient] = useState(null);

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initClientAndCheckStatus = async () => {
      if (!authUser || !tokenData?.token || friends.length === 0) return;

      try {
        const chatClient = StreamChat.getInstance(STREAM_API_KEY);

        // Avoid reconnecting if already connected
        if (!chatClient.userID) {
          await chatClient.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: authUser.profilePic,
            },
            tokenData.token
          );
        }

        setClient(chatClient);

        const friendIds = friends.map((f) => f._id);
        const response = await chatClient.queryUsers({ id: { $in: friendIds } });

        const statusMap = {};
        response.users.forEach((user) => {
          statusMap[user.id] = user.online;
        });

        setOnlineStatus(statusMap);
      } catch (error) {
        console.error("Error checking online status", error);
      }
    };

    initClientAndCheckStatus();
  }, [authUser, tokenData, friends]);

  return (
    <aside className="w-72 border-r bg-base-200 h-full overflow-y-auto p-4">
      <h2 className="text-4xl border-b-2 border-black font-bold mb-4">Chats</h2>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-md" />
        </div>
      ) : friends.length === 0 ? (
        <p className="text-center text-sm opacity-60">No friends to chat with</p>
      ) : (
        <ul className="space-y-3">
          {friends.map((friend) => {
            const chatPath = `/chat/${friend._id}`;
            const isActive = pathname === chatPath;
            const isOnline = onlineStatus[friend._id];

            return (
              <li key={friend._id}>
                <Link
                to={chatPath}
                className={`flex items-center gap-4 p-3 rounded-lg transition-transform duration-250 ease-in-out active:scale-[1.1] ${
                    isActive ? "bg-primary text-primary-content" : "hover:bg-base-300"
                }`}
                >

                    <div className="avatar">
                        <div className="w-12 rounded-full">
                        <img src={friend.profilePic} alt={friend.fullName} />
                        </div>
                    </div>

                    <div className="flex-1">
                        <p className="font-semibold text-sm">{friend.fullName}</p>
                        <p
                        className={`text-xs flex items-center gap-1 ${
                            isOnline ? "text-success" : "text-gray-500"
                        }`}
                        >
                        <span
                            className={`size-2 rounded-full inline-block ${
                            isOnline ? "bg-success" : "bg-gray-400"
                            }`}
                        />
                        {isOnline ? "Online" : "Offline"}
                        </p>
                    </div>
                    </Link>

              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

export default ChatSidebar;
