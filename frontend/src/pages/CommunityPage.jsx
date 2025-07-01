import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
} from "stream-chat-react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MessagesSquare, X, Trash2 } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken, getUserFriends } from "../lib/api";
import ChatLoader from "../components/ChatLoader";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const COMMUNITIES = [
  { id: "english", name: "English" },
  { id: "hindi", name: "Hindi" },
  { id: "spanish", name: "Spanish" },
  { id: "french", name: "French" },
  { id: "japanese", name: "Japanese" },
];

const CommunityPage = () => {
  const { authUser } = useAuthUser();
  const [chatClient, setChatClient] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myCommunities, setMyCommunities] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });
  const navigate = useNavigate();
  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initClient = async () => {
      if (!tokenData?.token || !authUser) return;

      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);

        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        const fetchUserCommunities = async () => {
          const filters = {
            type: "team",
            members: { $in: [authUser._id] },
          };
          const sort = [{ last_message_at: -1 }];
          const userChannels = await client.queryChannels(filters, sort, {
            watch: true,
            state: true,
          });

          const myCreated = userChannels
            .filter((channel) => !COMMUNITIES.some((c) => c.id === channel.id))
            .map((channel) => ({
              id: channel.id,
              name: channel.data.name,
              createdBy: channel.data.createdBy, // 👈 use custom field
            }));

          setMyCommunities(myCreated);
        };

        await fetchUserCommunities();
        setChatClient(client);
      } catch (error) {
        console.error("Error initializing Stream client:", error);
        toast.error("Failed to connect to community chat");
      } finally {
        setLoading(false);
      }
    };

    initClient();
  }, [authUser, tokenData]);

  const handleJoinCommunity = async (communityId, name) => {
    if (!chatClient || !authUser) return;

    try {
      const channel = chatClient.channel("team", communityId, { name });

      const state = await channel.query();
      const isAlreadyMember = state.members?.some(
        (m) => m.user_id === authUser._id
      );

      if (!isAlreadyMember) {
        await channel.addMembers([authUser._id]);
      }

      await channel.watch();
      setActiveChannel(channel);
    } catch (err) {
      console.error("Join failed", err);
      toast.error("Could not join the community");
    }
  };

  const handleCreateCommunity = async () => {
    if (!chatClient || !communityName.trim()) return;

    const communityId =
      communityName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();

    try {
      const channel = chatClient.channel("team", communityId, {
        name: communityName,
        members: [authUser._id, ...selectedFriends],
        createdBy: authUser._id, // 👈 custom field
      });

      await channel.create();
      await channel.watch();

      setMyCommunities((prev) => [
        ...prev,
        { id: communityId, name: communityName, createdBy: authUser._id },
      ]);

      setActiveChannel(channel);
      setShowModal(false);
      setCommunityName("");
      setSelectedFriends([]);

      toast.success("Community created!");
    } catch (error) {
      console.error("Error creating community:", error);
      toast.error("Failed to create community");
    }
  };

  const handleDeleteCommunity = async (communityId) => {
    if (!chatClient) return;

    try {
      const channel = chatClient.channel("team", communityId);
      await channel.watch(); // ensure data is populated
      const createdBy = channel.data.createdBy;

      if (createdBy !== authUser._id) {
        toast.error("Only the creator can delete this community.");
        return;
      }

      await channel.delete();

      setMyCommunities((prev) => prev.filter((c) => c.id !== communityId));

      if (activeChannel?.id === communityId) {
        setActiveChannel(null);
        navigate("/");
      }

      toast.success("Community deleted successfully.");
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete community", err);
      toast.error("Failed to delete community.");
    }
  };

  const toggleFriendSelection = (id) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  if (loading || !chatClient) return <ChatLoader />;

  return (
    <div className="flex h-[93vh]">
      <aside className="w-72 border-r bg-base-200 h-full overflow-y-auto p-4">
        <h2 className="text-3xl border-b-2 border-black font-bold mb-4">
          Communities
        </h2>

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-primary text-white py-2 px-4 rounded-lg mb-4"
        >
          + Create Community
        </button>

        <ul className="space-y-3">
          {COMMUNITIES.map((community) => (
            <li key={community.id}>
              <button
                onClick={() =>
                  handleJoinCommunity(community.id, community.name)
                }
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  activeChannel?.id === community.id
                    ? "bg-primary text-primary-content"
                    : "hover:bg-base-300"
                }`}
              >
                <p className="font-semibold text-sm">{community.name}</p>
                <p className="text-xs text-gray-500">Join conversation</p>
              </button>
            </li>
          ))}
        </ul>

        {myCommunities.length > 0 && (
          <div className="mt-6">
            <h3 className="text-2xl border-b-2 border-black font-bold mb-4">
              My Communities
            </h3>
            <ul className="space-y-3">
              {myCommunities.map((community) => (
                <li
                  key={community.id}
                  className="flex items-center justify-between"
                >
                  <button
                    onClick={() =>
                      handleJoinCommunity(community.id, community.name)
                    }
                    className={`flex-1 text-left p-3 rounded-lg transition-all duration-200 ${
                      activeChannel?.id === community.id
                        ? "bg-primary text-primary-content"
                        : "hover:bg-base-300"
                    }`}
                  >
                    <p className="font-semibold text-sm">{community.name}</p>
                    <p className="text-xs text-gray-500">Join conversation</p>
                  </button>
                  {community.createdBy === authUser._id && (
                    <button
                      onClick={() => handleDeleteCommunity(community.id)}
                      className="ml-2 p-2 hover:bg-red-400 text-red-600 rounded-full transition"
                      title="Delete Community"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      <div className="flex-1 h-full">
        <Chat client={chatClient}>
          {activeChannel ? (
            <Channel channel={activeChannel}>
              <div className="w-full relative">
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput focus />
                </Window>
              </div>
              <Thread />
            </Channel>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-center px-4">
              <div>
                <p className="text-2xl sm:text-3xl font-semibold mb-4">
                  Select a community to start chatting
                </p>
                <MessagesSquare className="h-12 w-12 text-gray-400 mx-auto" />
              </div>
            </div>
          )}
        </Chat>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Create New Community</h2>

            <input
              type="text"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              placeholder="Enter community name"
              className="input input-bordered w-full mb-4"
            />

            <div className="max-h-48 overflow-y-auto mb-4">
              <p className="mb-2 font-medium">Select Friends:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {friends.map((friend) => {
                  const isSelected = selectedFriends.includes(friend._id);
                  return (
                    <div
                      key={friend._id}
                      onClick={() => toggleFriendSelection(friend._id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition border ${
                        isSelected
                          ? "bg-primary text-white border-primary"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <img
                        src={friend.profilePic}
                        alt={friend.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <span className="text-md">
                        {friend.fullName.replace(
                          /\b\w/g,
                          (char) => char.toUpperCase()
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCreateCommunity}
              className="btn btn-primary w-full"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
