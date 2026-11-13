const Avatar = (() => {
  function getImageUrl(data) {
    const imageUrl = data.photoUrl || data.avatarUrl;
    if (imageUrl) return imageUrl;
  }

  function getFirstLetter(data) {
    const userName = data.name || data.displayName || data.email || data.authorName || "Anonymous User";
    const letter = escapeHTML(userName.charAt(0).toUpperCase());

    return letter;
  }

  function createHTML(data, isOuter = true) {
    data = data || currentAuthUser;
    const imageUrl = getImageUrl(data);

    if (imageUrl) return `<img${isOuter ? ` class="avatar"` : ""} src="${imageUrl}">`;

    const letter = getFirstLetter(data);
    return `<div${isOuter ? ` class="avatar"` : ""}>${letter}</div>`;
  }

  return { getImageUrl, getFirstLetter, createHTML };
})();
