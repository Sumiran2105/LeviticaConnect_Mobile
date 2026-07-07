const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_PUNCTUATION = /[),.!?:;]+$/;

function isUrlPart(value) {
  return /^(?:https?:\/\/|www\.)/i.test(value);
}

function normalizeHref(value) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function splitTrailingPunctuation(value) {
  const match = value.match(TRAILING_PUNCTUATION);

  if (!match) {
    return [value, ""];
  }

  return [value.slice(0, -match[0].length), match[0]];
}

export function LinkifiedText({
  text,
  className = "",
  linkClassName = "",
}) {
  if (!text) {
    return null;
  }

  const parts = String(text).split(URL_PATTERN);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) {
          return null;
        }

        if (!isUrlPart(part)) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        const [urlText, trailingText] = splitTrailingPunctuation(part);

        return (
          <span key={`${part}-${index}`}>
            <a
              href={normalizeHref(urlText)}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName || "font-semibold underline underline-offset-2"}
              onClick={(event) => event.stopPropagation()}
            >
              {urlText}
            </a>
            {trailingText}
          </span>
        );
      })}
    </span>
  );
}
