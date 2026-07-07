import { memo, useState, useMemo, useCallback } from "react";
import { X, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

const EMOJI_CATEGORIES = {
  recent: {
    label: "Recent",
    emojis: [],
  },
  smileys: {
    label: "Smileys & Emotion",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😌", "😔", "😑", "😐", "😶", "🥱", "😏", "😒", "🙁", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"],
  },
  people: {
    label: "People & Body",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🤜", "🤛", "🤞", "🫱", "🫲", "🫳", "🫴", "🫵", "🫶", "💪", "🦾", "🦿", "🦴", "🧠", "🦷", "🦴", "🧠", "🧬", "🦠", "🧫", "🧪"],
  },
  nature: {
    label: "Nature",
    emojis: ["🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🎍", "🎎", "🎏", "🍃", "🍂", "🍁", "🍄", "💐", "🌊", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪", "🕌", "🕍", "🛕", "🕋", "⛩️", "🛤️", "🛣️", "🗾", "🎑", "🏞️", "🌅", "🌄", "🌠", "🎇", "🎆", "🌇", "🌆", "🏙️", "🌃", "🌌", "🌉", "🌁", "⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "🧮", "🎥", "🎬", "📺", "📷", "📸", "📹", "🎞️", "📽️", "🎦", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "🧾", "✉️", "📩", "📨", "📤", "📥", "📦", "🏷️", "🧧", "📪", "📫", "📬", "📭", "📮", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📝", "📁", "📂", "📅", "📆", "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📐", "📏", "🧮", "📓", "📔", "📒", "📚", "📖", "🧷", "🧷", "📘", "📙", "📗", "📬", "📭", "📮", "📪", "🧷", "🧷", "📰", "🗞️", "📜", "📃", "📄", "📰"],
  },
  food: {
    label: "Food & Drink",
    emojis: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🥓", "🥞", "🍤", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🥗", "🥘", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🍰", "🎂", "🧁", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🍯", "🥛", "🍼", "☕", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃"],
  },
  activity: {
    label: "Activity",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎳", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "⛸️", "🎣", "🎽", "🎿", "⛷️", "🏂", "🪂", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎯", "🪀", "🪃", "🎲", "♠️", "♥️", "♦️", "♣️", "🎰", "🧩", "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🏎️", "🛵", "🦯", "🦽", "🦼", "🛺", "🚲", "🛴", "🛹", "🛼", "🛺", "🚏", "⛽", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛰️", "💺", "🛶", "⛵", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "🚧", "⚓", "⛽", "🚧", "🚨", "🚥", "🚦", "🛑", "🎪", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩"],
  },
  objects: {
    label: "Objects",
    emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "🧮", "🎥", "🎬", "📺", "📷", "📸", "📹", "🎞️", "📽️", "🎦", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "🧾", "✉️", "📩", "📨", "📤", "📥", "📦", "🏷️", "🧧", "📪", "📫", "📬", "📭", "📮", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📝", "📁", "📂", "📅", "📆", "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📐", "📏", "🧮", "📓", "📔", "📒", "📚", "📖", "🧷", "🧷", "📘", "📙", "📗", "📬", "📭", "📮", "📪", "🧷", "🧷", "📰", "🗞️", "📜", "📃", "📄", "📰", "🎓", "🎒", "🧳", "🎨", "🎏", "🎎", "🖼️", "🧩", "🎮", "🎯", "🎲", "🧩", "♠️", "♥️", "♦️", "♣️", "♟️", "🃏", "🎭", "🎪", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🧩", "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻"],
  },
  symbols: {
    label: "Symbols",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❤️", "🔥", "💥", "⚡", "✨", "💫", "⭐", "🌟", "✌️", "👌", "🤏", "💯", "🔔", "📢", "📣", "📯", "🔊", "🔉", "🔈", "📻", "📺", "📱", "☎️", "📞", "📟", "📠", "🔕", "🔔", "📢", "📣", "📯", "⏰", "⏱️", "⏲️", "🕰️", "⌛", "⏳", "📅", "📆", "🗓️", "🗒️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📐", "📏", "🧮", "📓", "📔", "📒", "📚", "📖", "🧷", "🧷", "📘", "📙", "📗", "📬", "📭", "📮", "📪", "🧷", "🧷", "📰", "🗞️", "📜", "📃", "📄", "📰", "💼", "📋", "📊", "📈", "📉", "📑", "🧾", "✉️", "📩", "📨", "📤", "📥", "📦", "🏷️", "🧧", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📝", "📁", "📂", "📅", "📆", "🗓️"],
  },
};

const STORAGE_KEY = "emoji_picker_recent";

const loadRecentEmojis = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored).slice(0, 8) : [];
  } catch {
    return [];
  }
};

const saveRecentEmoji = (emoji) => {
  try {
    const recent = loadRecentEmojis();
    const filtered = recent.filter((e) => e !== emoji);
    const updated = [emoji, ...filtered].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage failures; emoji selection should still work.
  }
};

export const EmojiPicker = memo(function EmojiPicker({
  onEmojiSelect,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("smileys");
  const recentEmojis = loadRecentEmojis();

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      return selectedCategory === "recent" ? recentEmojis : EMOJI_CATEGORIES[selectedCategory]?.emojis || [];
    }

    const query = searchQuery.toLowerCase();
    const categoryNames = Object.keys(EMOJI_CATEGORIES);
    let results = [];

    categoryNames.forEach((cat) => {
      const catName = EMOJI_CATEGORIES[cat].label.toLowerCase();
      if (catName.includes(query)) {
        results = [...results, ...EMOJI_CATEGORIES[cat].emojis];
      }
    });

    return results.slice(0, 50);
  }, [searchQuery, selectedCategory, recentEmojis]);

  const handleEmojiSelect = useCallback(
    (emoji) => {
      saveRecentEmoji(emoji);
      onEmojiSelect?.(emoji);
    },
    [onEmojiSelect]
  );

  const categories = [
    { key: "recent", label: "🕐", title: "Recent" },
    { key: "smileys", label: "😀", title: "Smileys" },
    { key: "people", label: "👋", title: "People" },
    { key: "nature", label: "🌿", title: "Nature" },
    { key: "food", label: "🍎", title: "Food" },
    { key: "activity", label: "⚽", title: "Activity" },
    { key: "objects", label: "💻", title: "Objects" },
    { key: "symbols", label: "❤️", title: "Symbols" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative h-[600px] w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Pick your emoji</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Find something fun"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Emoji Grid */}
        <ScrollArea className="h-80 border-b border-gray-200">
          <div className="p-4">
            {recentEmojis.length > 0 && selectedCategory === "recent" && !searchQuery && (
              <div className="mb-6">
                <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">Recent</h3>
                <div className="grid grid-cols-8 gap-2">
                  {recentEmojis.map((emoji) => (
                    <button
                      key={`recent-${emoji}`}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="flex size-10 items-center justify-center rounded-lg text-xl transition hover:bg-gray-100"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!searchQuery && (
              <div className="mb-4">
                <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">
                  {EMOJI_CATEGORIES[selectedCategory]?.label}
                </h3>
              </div>
            )}

            <div className="grid grid-cols-8 gap-2">
              {filteredEmojis.map((emoji) => (
                <button
                  key={`emoji-${emoji}`}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="flex size-10 items-center justify-center rounded-lg text-xl transition hover:bg-brand-soft hover:text-brand-primary"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {filteredEmojis.length === 0 && (
              <div className="flex h-40 items-center justify-center text-gray-400">
                <p>No emojis found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Category Tabs */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex size-9 items-center justify-center rounded-lg text-lg transition ${
                selectedCategory === cat.key
                  ? "bg-brand-primary text-white"
                  : "text-gray-600 hover:bg-white hover:text-brand-primary"
              }`}
              title={cat.title}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
