import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkifiedText } from "@/components/linkified-text";
import { COMMUNITY_ADD_REPLY, COMMUNITY_DELETE_REPLY, COMMUNITY_LIST_REPLIES } from "@/config/api";
import { apiClient } from "@/lib/client";

import { formatDate, getInitials } from "@/lib/community-utils";

function getReplyUser(reply) {
  const name =
    reply.user?.name ||
    reply.user?.full_name ||
    reply.user_name ||
    reply.full_name ||
    reply.name ||
    "Community member";

  return {
    id: reply.user?.id || reply.user_id,
    name,
    avatar: reply.user?.avatar_url || reply.user?.profile_image || reply.profile_image,
  };
}

export function PostReplies({ postId, activeCommunityId, userProfile, isAdmin }) {
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["post-replies", postId],
    queryFn: async () => {
      const response = await apiClient.get(COMMUNITY_LIST_REPLIES(postId));
      return response.data;
    },
  });

  const addReplyMutation = useMutation({
    mutationFn: async (content) => {
      const response = await apiClient.post(COMMUNITY_ADD_REPLY(postId), { content });
      return response.data;
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["post-replies", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
      toast.success("Reply added successfully.");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not add reply.");
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId) => {
      const response = await apiClient.delete(COMMUNITY_DELETE_REPLY(replyId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-replies", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts", activeCommunityId] });
      toast.success("Reply deleted.");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || "Could not delete reply.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    addReplyMutation.mutate(replyText.trim());
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-2 text-slate-400">
          <LoaderCircle className="size-4 animate-spin text-[#3B5BFC]" />
        </div>
      ) : replies.length ? (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {replies.map((reply) => {
            const replyUser = getReplyUser(reply);

            return (
              <div key={reply.id} className="flex items-start gap-3 text-xs bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/60">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1094EB]/10 to-[#3B5BFC]/10 font-bold text-[#3B5BFC] text-[10px]">
                  {getInitials(replyUser.name || "Member")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700">{replyUser.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    <LinkifiedText
                      text={reply.content}
                      className="whitespace-pre-wrap break-words"
                      linkClassName="font-semibold text-[#3B5BFC] underline underline-offset-2"
                    />
                  </p>
                </div>
                {(isAdmin || String(reply.user_id) === String(userProfile?.id) || String(replyUser.id) === String(userProfile?.id)) && (
                  <button
                    type="button"
                    onClick={() => deleteReplyMutation.mutate(reply.id)}
                    disabled={deleteReplyMutation.isPending}
                    className="text-red-500 hover:text-red-700 p-1 font-semibold transition-colors disabled:opacity-50 text-[10px]"
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-xs text-slate-400 py-1">No replies yet. Be the first to reply!</p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Write a reply..."
          className="h-9 rounded-xl border border-slate-200 bg-white text-xs px-3 focus-visible:ring-1 focus-visible:ring-[#3B5BFC] transition-all text-slate-700 placeholder:text-slate-400"
        />
        <Button
          type="submit"
          disabled={!replyText.trim() || addReplyMutation.isPending}
          className="h-9 rounded-xl bg-[#3B5BFC] hover:bg-[#2563EB] text-xs font-bold text-white px-4 shrink-0 transition-all border-0"
        >
          {addReplyMutation.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : "Send"}
        </Button>
      </form>
    </div>
  );
}
