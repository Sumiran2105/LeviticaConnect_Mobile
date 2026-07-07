import { Image, LoaderCircle, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { getInitials, getUserEmail, getUserId, getUserName, toUserCamelCase } from "@/lib/community-utils";

export function CommunityDialogs({
  isAdmin,
  isDeleteCommunityModalOpen,
  setIsDeleteCommunityModalOpen,
  setDeleteCommunityConfirmChecked,
  setDeleteCommunityNameInput,
  selectedCommunity,
  deleteCommunityConfirmChecked,
  deleteCommunityNameInput,
  canDeleteCommunity,
  deleteCommunityMutation,
  isCreateModalOpen,
  setIsCreateModalOpen,
  handleCreateCommunity,
  communityNameInputRef,
  communityName,
  setCommunityName,
  communityDescription,
  setCommunityDescription,
  canCreateCommunity,
  createCommunityMutation,
  isCreatePostModalOpen,
  setIsCreatePostModalOpen,
  handlePostSubmit,
  userProfile,
  session,
  postContent,
  setPostContent,
  setMediaUrl,
  createPostMutation,
  isAddMemberModalOpen,
  setIsAddMemberModalOpen,
  memberSearchQuery,
  setMemberSearchQuery,
  selectedMemberUser,
  setSelectedMemberUser,
  addMemberError,
  setAddMemberError,
  memberSearchQueryResult,
  memberSearchResults,
  addMemberMutation,
  isEditModalOpen,
  setIsEditModalOpen,
  editingPostId,
  setEditingPostId,
  editingPostContent,
  setEditingPostContent,
  editPostMutation,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  deletingPostId,
  setDeletingPostId,
  removePostMutation,
}) {
  return (
    <>
      {isAdmin ? (
        <Dialog
          open={isDeleteCommunityModalOpen}
          onOpenChange={(open) => {
            setIsDeleteCommunityModalOpen(open);
            if (!open) {
              setDeleteCommunityConfirmChecked(false);
              setDeleteCommunityNameInput("");
            }
          }}
        >
          <DialogContent className="rounded-3xl border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md overflow-hidden text-slate-800">
            <DialogHeader className="px-8 pt-8 pb-4">
              <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 className="size-5" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight">
                Delete Community
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 font-medium">
                This permanently deletes {selectedCommunity?.name || "this community"} and its community data.
              </DialogDescription>
            </DialogHeader>

            <form
              className="px-8 pb-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (canDeleteCommunity) {
                  deleteCommunityMutation.mutate();
                }
              }}
            >
              <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-sm font-semibold text-rose-700">
                <input
                  type="checkbox"
                  checked={deleteCommunityConfirmChecked}
                  onChange={(event) => setDeleteCommunityConfirmChecked(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-rose-300 accent-rose-600"
                />
                <span>I understand this action cannot be undone.</span>
              </label>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Type {selectedCommunity?.name || "community name"} to confirm
                </label>
                <Input
                  value={deleteCommunityNameInput}
                  onChange={(event) => setDeleteCommunityNameInput(event.target.value)}
                  placeholder={selectedCommunity?.name || "Community name"}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 focus-visible:border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-500/10"
                />
              </div>

              <DialogFooter className="-mx-8 -mb-8 px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteCommunityModalOpen(false)}
                  className="h-10 rounded-xl border-slate-200 bg-white px-5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canDeleteCommunity || deleteCommunityMutation.isPending}
                  className="h-10 rounded-xl border-0 bg-rose-600 px-6 font-bold text-white shadow-md shadow-rose-500/10 transition-all hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleteCommunityMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    "Delete Community"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {isAdmin ? (
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="rounded-3xl md:rounded-[32px] border-none bg-white p-0 shadow-2xl w-[95vw] max-w-lg overflow-hidden text-slate-800">
            <DialogHeader className="px-8 pt-8 pb-4">
              <DialogTitle className="text-2xl font-extrabold text-slate-800 tracking-tight">
                {toUserCamelCase("create community")}
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium lowercase">
                create a new community workspace for collaboration and communication.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCommunity} className="px-8 pb-8 space-y-6">
              <div className="space-y-2">
                <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">{toUserCamelCase("community name")} *</label>
                <Input
                  ref={communityNameInputRef}
                  value={communityName}
                  onChange={(event) => setCommunityName(event.target.value)}
                  placeholder="Community name"
                  className="h-11 bg-white border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 transition-all text-slate-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">{toUserCamelCase("short description")} *</label>
                <Textarea
                  value={communityDescription}
                  onChange={(event) => setCommunityDescription(event.target.value)}
                  placeholder="Short description"
                  className="min-h-24 bg-white border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 transition-all text-slate-700"
                  required
                />
              </div>
              <DialogFooter className="-mx-8 -mb-8 px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setCommunityName("");
                    setCommunityDescription("");
                  }}
                  className="h-10 rounded-xl border-slate-200 text-slate-650 font-bold bg-white hover:bg-slate-50 transition-all px-5 text-slate-600"
                >
                  {toUserCamelCase("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!canCreateCommunity || createCommunityMutation.isPending}
                  className="h-10 rounded-xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] font-bold text-white hover:opacity-95 shadow-md shadow-indigo-500/10 border-0 transition-all px-6 active:scale-[0.98]"
                >
                  {createCommunityMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    toUserCamelCase("create")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={isCreatePostModalOpen} onOpenChange={setIsCreatePostModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl bg-white border-none p-6 shadow-2xl overflow-hidden">
          <form onSubmit={handlePostSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="size-11 shrink-0 rounded-full bg-gradient-to-br from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] flex items-center justify-center font-bold text-white uppercase text-sm shadow-sm ring-2 ring-white shadow-indigo-500/10">
                {getInitials(userProfile?.name || session?.name || "Member")}
              </div>
              <div className="min-w-0 flex-1">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share an announcement with the community..."
                  className="w-full min-h-24 bg-transparent border-0 text-sm sm:text-[15px] text-slate-700 placeholder-slate-400 focus:outline-none resize-none"
                  required
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt("Enter image or media URL:");
                    if (url) setMediaUrl(url);
                  }}
                  className="hover:text-slate-655 hover:text-[#3B5BFC] transition-colors"
                  title="Add image"
                >
                  <Image className="size-4.5" />
                </button>
                <button type="button" className="hover:text-[#3B5BFC] transition-colors" title="Attach file">
                  <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button type="button" className="hover:text-[#3B5BFC] transition-colors font-black text-xs select-none" title="Bold">
                  B
                </button>
                <button type="button" className="hover:text-[#3B5BFC] transition-colors" title="Add poll">
                  <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </button>

                <span className="h-4 w-px bg-slate-200" />

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer select-none">
                  <input type="checkbox" className="size-3.5 rounded border-slate-300 accent-[#3B5BFC]" />
                  Mark as Announcement
                </label>
              </div>

              <Button
                type="submit"
                disabled={!postContent.trim() || createPostMutation.isPending}
                className="h-9 rounded-xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] px-6 text-xs font-bold text-white hover:opacity-95 shadow-md shadow-indigo-500/10 border-0 transition-all active:scale-[0.98]"
              >
                {createPostMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddMemberModalOpen}
        onOpenChange={(open) => {
          setIsAddMemberModalOpen(open);
          if (!open) {
            setMemberSearchQuery("");
            setSelectedMemberUser(null);
            setAddMemberError("");
          }
        }}
      >
        <DialogContent className="rounded-3xl border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md text-slate-800">
          <DialogHeader className="px-8 pt-8 pb-4">
            <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight">
              {toUserCamelCase("add community member")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400 font-medium lowercase">
              search and select a user to add to this community workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const targetUserId = getUserId(selectedMemberUser);
              if (!targetUserId) {
                setAddMemberError("Select a user from the search results.");
                return;
              }
              addMemberMutation.mutate(targetUserId);
            }}
            className="px-8 pb-8 space-y-5"
          >
            <div className="space-y-2 text-left relative">
              <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">{toUserCamelCase("user id email")}</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  value={memberSearchQuery}
                  onChange={(event) => {
                    setMemberSearchQuery(event.target.value);
                    setSelectedMemberUser(null);
                    setAddMemberError("");
                  }}
                  placeholder="enter user unique identifier"
                  className="h-12 rounded-2xl border-0 bg-slate-100/70 pl-11 pr-11 text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500/10 lowercase"
                  disabled={addMemberMutation.isPending}
                />
                {memberSearchQueryResult.isFetching ? (
                  <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-[#3B5BFC]/60" />
                ) : null}
              </div>
              {addMemberError ? (
                <p className="mt-1 ml-1 text-xs font-bold text-red-500 lowercase">{addMemberError}</p>
              ) : null}

              {selectedMemberUser ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-left">
                  <p className="text-xs font-bold text-slate-800">{toUserCamelCase(getUserName(selectedMemberUser))}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 lowercase">{getUserEmail(selectedMemberUser) || getUserId(selectedMemberUser)}</p>
                </div>
              ) : null}

              {memberSearchResults.length > 0 && !selectedMemberUser ? (
                <div className="absolute top-full left-0 right-0 z-[100] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <ScrollArea className="max-h-[220px]">
                    <div className="p-2 space-y-1">
                      {memberSearchResults.map((user) => {
                        const userId = getUserId(user);
                        const userName = getUserName(user);
                        const userEmail = getUserEmail(user);

                        return (
                          <button
                            key={userId}
                            type="button"
                            onClick={() => {
                              setSelectedMemberUser(user);
                              setMemberSearchQuery(userName);
                              setAddMemberError("");
                            }}
                            className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
                          >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#3B5BFC]/10 text-xs font-bold text-[#3B5BFC]">
                              {getInitials(userName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-slate-800 transition-colors group-hover:text-[#3B5BFC]">
                                {toUserCamelCase(userName)}
                              </p>
                              <p className="truncate text-[10px] text-slate-400 lowercase">{userEmail || userId}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}

              {memberSearchQuery.trim().length >= 2 && !memberSearchQueryResult.isFetching && !selectedMemberUser && !memberSearchResults.length ? (
                <p className="mt-1 ml-1 text-xs font-bold text-slate-400 lowercase">No users found</p>
              ) : null}
            </div>
            <DialogFooter className="sticky bottom-0 -mx-8 -mb-8 px-8 py-4 border-t border-slate-100 bg-slate-50/95 backdrop-blur flex gap-2 justify-end rounded-b-3xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddMemberModalOpen(false);
                  setMemberSearchQuery("");
                  setSelectedMemberUser(null);
                  setAddMemberError("");
                }}
                className="h-10 rounded-xl border-slate-200 text-slate-650 font-bold bg-white hover:bg-slate-50 transition-all px-5 text-slate-650 text-slate-600"
              >
                {toUserCamelCase("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!getUserId(selectedMemberUser) || addMemberMutation.isPending}
                className="h-10 rounded-xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] font-bold text-white hover:opacity-95 shadow-md shadow-indigo-500/10 border-0 transition-all px-6 active:scale-[0.98]"
              >
                {addMemberMutation.isPending ? "Adding..." : toUserCamelCase("add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="rounded-3xl border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md overflow-hidden text-slate-800">
          <DialogHeader className="px-8 pt-8 pb-4">
            <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight">
              {toUserCamelCase("edit post")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400 font-medium lowercase">
              modify the content of your post.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editingPostContent.trim()) {
                editPostMutation.mutate({ postId: editingPostId, content: editingPostContent.trim() });
              }
            }}
            className="px-8 pb-8 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-slate-500 font-bold text-xs uppercase tracking-wider">{toUserCamelCase("content")} *</label>
              <Textarea
                value={editingPostContent}
                onChange={(e) => setEditingPostContent(e.target.value)}
                placeholder="Write your update..."
                className="min-h-28 bg-white border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500/10 focus-visible:border-indigo-500 transition-all text-slate-700 placeholder-slate-400"
                required
              />
            </div>
            <DialogFooter className="-mx-8 -mb-8 px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPostId("");
                  setEditingPostContent("");
                }}
                className="h-10 rounded-xl border-slate-200 text-slate-650 font-bold bg-white hover:bg-slate-50 transition-all px-5 text-slate-650 text-slate-600"
              >
                {toUserCamelCase("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!editingPostContent.trim() || editPostMutation.isPending}
                className="h-10 rounded-xl bg-gradient-to-r from-[#1094EB] via-[#3B5BFC] to-[#9A2DF2] font-bold text-white hover:opacity-95 shadow-md shadow-indigo-500/10 border-0 transition-all px-6 active:scale-[0.98]"
              >
                {editPostMutation.isPending ? "Saving..." : toUserCamelCase("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="rounded-3xl border-none bg-white p-0 shadow-2xl w-[95vw] max-w-md overflow-hidden text-slate-800">
          <DialogHeader className="px-8 pt-8 pb-4">
            <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight">
              {toUserCamelCase("delete post")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400 font-medium lowercase">
              are you sure you want to delete this post? this action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingPostId("");
              }}
              className="h-10 rounded-xl border-slate-200 text-slate-650 font-bold bg-white hover:bg-slate-50 transition-all px-5 text-slate-650 text-slate-600"
            >
              {toUserCamelCase("cancel")}
            </Button>
            <Button
              type="button"
              disabled={removePostMutation.isPending}
              onClick={() => {
                if (deletingPostId) {
                  removePostMutation.mutate(deletingPostId);
                }
              }}
              className="h-10 rounded-xl bg-rose-600 font-bold text-white hover:bg-rose-700 px-6 border-0 shadow-md shadow-rose-500/10 transition-all active:scale-[0.98]"
            >
              {removePostMutation.isPending ? "Deleting..." : toUserCamelCase("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
