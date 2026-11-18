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

  function createInner(data) {
    data = data || currentAuthUser;
    const imageUrl = getImageUrl(data);
    const letter = getFirstLetter(data);

    return imageUrl ? `<img src="${imageUrl}">` : `<div>${letter}</div>`;
  }

  function createHTML(data, isOuter = true) {
    return `<div class="avatar">${createInner(data)}</div>`;
  }

  return { getImageUrl, getFirstLetter, createInner, createHTML };
})();
